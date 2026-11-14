/**
 * Attack test: in hosted mode, file_url must never make the server fetch a
 * loopback, private, link-local or cloud-metadata address, including through an
 * IPv4-mapped IPv6 literal or an HTTP redirect from a public URL. The fetched
 * bytes are uploaded to ClickUp, where the caller can read them back.
 *
 * Found by adversarial review: the hostname-string guard let
 * http://[::ffff:127.0.0.1]/ and a public URL that 302s to loopback through.
 * Hosted mode now refuses file_url outright, so every case must reject before
 * any network fetch happens.
 */
import { AttachmentsEnhancedClient } from '../../clickup-client/attachments-enhanced';
import { REMOTE_MODE_ENV, runWithClickUpToken } from '../../clickup-client/request-context';

type FetchInit = NonNullable<Parameters<typeof fetch>[1]>;

const SECRET = 'INTERNAL-ONLY-SECRET';

describe('hosted file_url SSRF guard', () => {
  let uploads: string[];
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env[REMOTE_MODE_ENV] = '1';
    uploads = [];
    // Simulates the network: a public URL that 302s to the metadata service,
    // and internal addresses that answer with a secret.
    fetchSpy = jest.spyOn(global, 'fetch').mockImplementation((async (
      input: unknown,
      init?: FetchInit
    ) => {
      const url = String(input);
      if (url.startsWith('https://files.example.com/')) {
        if (init?.redirect === 'manual' || init?.redirect === 'error') {
          return new Response(null, {
            status: 302,
            headers: { location: 'http://169.254.169.254/latest/meta-data/' },
          });
        }
        return new Response(SECRET, { status: 200 }); // redirect followed
      }
      return new Response(SECRET, { status: 200 });
    }) as typeof fetch);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    delete process.env[REMOTE_MODE_ENV];
  });

  const upload = (fileUrl: string) => {
    const client = new AttachmentsEnhancedClient('pk_x');
    client.getAxiosInstance().defaults.adapter = async config => {
      const blob = (config.data as FormData).get('attachment') as Blob;
      uploads.push(await blob.text());
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    };
    return runWithClickUpToken('oauth-abc', () =>
      client.uploadAttachment({ task_id: 't1', filename: 'f.txt', file_url: fileUrl } as never)
    );
  };

  it.each([
    'http://[::ffff:127.0.0.1]:8080/secret',
    'http://[::ffff:a9fe:a9fe]/latest/meta-data/',
    'http://[fd00:ec2::254]/latest/meta-data/',
    'http://100.100.100.200/latest/meta-data/',
    'https://files.example.com/report.pdf',
  ])('refuses %s and uploads nothing internal', async fileUrl => {
    await expect(upload(fileUrl)).rejects.toThrow(/file_url uploads are disabled/);
    expect(uploads.join('')).not.toContain(SECRET);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('still accepts file_data in hosted mode', async () => {
    const client = new AttachmentsEnhancedClient('pk_x');
    client.getAxiosInstance().defaults.adapter = async config => {
      const blob = (config.data as FormData).get('attachment') as Blob;
      uploads.push(await blob.text());
      return { data: { id: 'a1' }, status: 200, statusText: 'OK', headers: {}, config };
    };
    await runWithClickUpToken('oauth-abc', () =>
      client.uploadAttachment({
        task_id: 't1',
        filename: 'f.txt',
        file_data: Buffer.from('hello').toString('base64'),
      } as never)
    );
    expect(uploads).toEqual(['hello']);
  });
});
