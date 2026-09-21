# Access-control regression tests

Run from the repository root with the .NET 10 SDK:

```sh
dotnet test OmanCommunityServicesPlatform/OmanCommunityServicesPlatform.slnx --configuration Release
```

The tests run the real HTTP pipeline, JWT bearer authentication, controllers,
services, and repositories. Each test starts an isolated EF InMemory database
and signs tokens with a test-only key supplied before application startup.
No running API, SQL Server, production credentials, or email service is needed.
The suite does not verify SQL Server-specific behavior.

The policy covered by issue #128 is:

- Citizens can read comments, attachments, and ratings only for issues they reported.
- Citizens can create attachments only for issues they reported; the uploader comes from the JWT.
- Staff and Admin can read these resources for any issue. Attachment creation remains Citizen-only.
- All rating reads require authentication. The ratings collection is filtered by parent issue ownership for citizens.
- Notification reads and deletes allow the recipient or an Admin. Read-state changes allow only the recipient.
- Missing and inaccessible objects return identical 404 status codes and response bodies.
- Authorized empty collections retain their existing 200/204 responses.

The fixture also includes attachments and ratings authored by a different citizen
from the parent issue reporter, so author identity cannot accidentally replace
issue ownership as the access rule. Denied writes are checked against stored data.
