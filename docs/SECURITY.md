# Security Policy

## Supported Versions

Use this section to tell people about which versions of your project are currently being supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.5.x   | :white_check_mark: |
| 1.4.x   | :white_check_mark: |
| 1.3.x   | :x:                |
| < 1.3   | :x:                |

## Reporting a Vulnerability

We take the security of the ClickUp MCP Server seriously. If you believe you've found a security vulnerability, please follow these steps:

1. **Do not disclose the vulnerability publicly**
2. **Use GitHub's private vulnerability reporting feature**
   - Go to the repository's Security tab
   - Click on "Report a vulnerability"
   - Provide a detailed description of the vulnerability
   - Include steps to reproduce the issue
   - Attach any proof-of-concept code if applicable
   - Let us know how you'd like to be credited for the discovery (if desired)

3. **Alternatively, you can email the details to security@davidwhatley.com**

## What to Expect

- We will acknowledge receipt of your vulnerability report within 48 hours
- We will provide an initial assessment of the report within 7 days
- We aim to release a fix for verified vulnerabilities within 30 days
- We will keep you informed of our progress throughout the process
- After the issue is resolved, we will publicly acknowledge your responsible disclosure (unless you prefer to remain anonymous)

## Security Best Practices for Users

When using the ClickUp MCP Server:

1. **Keep your API tokens secure**
   - Do not hardcode tokens in your application
   - Use environment variables or secure secret management
   - Rotate tokens periodically

2. **Use the principle of least privilege**
   - Only grant the minimum permissions necessary for your use case

3. **Keep dependencies updated**
   - Regularly update the ClickUp MCP Server and its dependencies

4. **Monitor for suspicious activity**
   - Watch for unexpected API calls or unusual patterns

Thank you for helping keep the ClickUp MCP Server and its users safe!
