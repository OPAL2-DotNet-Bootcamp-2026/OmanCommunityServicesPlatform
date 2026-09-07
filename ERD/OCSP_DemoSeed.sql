/*
    Oman Community Services Platform - development demo seed

    Prerequisite:
      Apply the EF Core migrations so OCSP_Database and its tables exist.

    Demo logins (development only):
      admin.demo@ocsp.local   / OCSP-Demo-2026!
      staff.demo@ocsp.local   / OCSP-Demo-2026!
      citizen.demo@ocsp.local / OCSP-Demo-2026!

    Notes:
      - Change @ExistingCitizenEmail when you want to populate another
        already-registered citizen account.
      - Reruns refresh only the named reference/demo rows and never delete data.
      - All dates are stored in UTC because direct SQL bypasses C# defaults.
      - StatusUpdates store enum numbers: Open=0, InProgress=1, Resolved=2.
*/

USE [OCSP_Database];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;
GO

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @SeedNow datetime2(7) = SYSUTCDATETIME();
    DECLARE @ExistingCitizenEmail nvarchar(150) = N'ayhem9987@gmail.com';
    DECLARE @DemoPasswordHash nvarchar(256) = N'$argon2id$v=19$m=65536,t=3,p=1$mdQOJRPjnsUj0vBngvLBsw$WJtnIixmZ9ZC1/qaL/wlFknefnLm8m56KjXmI6nYPqU';

    /* ---------------------------------------------------------------------
       1. Regions
       --------------------------------------------------------------------- */

    DECLARE @RegionSeed TABLE
    (
        regionName nvarchar(100) NOT NULL PRIMARY KEY,
        governorate nvarchar(100) NOT NULL
    );

    INSERT INTO @RegionSeed (regionName, governorate)
    VALUES
        (N'Bawshar', N'Muscat'),
        (N'Seeb', N'Muscat'),
        (N'Muttrah', N'Muscat'),
        (N'Salalah', N'Dhofar'),
        (N'Khasab', N'Musandam'),
        (N'Al Buraimi', N'AlBuraimi'),
        (N'Nizwa', N'AdDakhiliyah'),
        (N'Sohar', N'AlBatinahNorth'),
        (N'Rustaq', N'AlBatinahSouth'),
        (N'Ibra', N'AshSharqiyahNorth'),
        (N'Sur', N'AshSharqiyahSouth'),
        (N'Ibri', N'AdhDhahirah'),
        (N'Duqm', N'AlWusta');

    INSERT INTO dbo.Regions (regionName, governorate)
    SELECT seed.regionName, seed.governorate
    FROM @RegionSeed AS seed
    WHERE NOT EXISTS
    (
        SELECT 1
        FROM dbo.Regions AS existing
        WHERE existing.regionName = seed.regionName
    );

    UPDATE existing
    SET existing.governorate = seed.governorate
    FROM dbo.Regions AS existing
    INNER JOIN @RegionSeed AS seed
        ON seed.regionName = existing.regionName;

    /* ---------------------------------------------------------------------
       2. Departments
       --------------------------------------------------------------------- */

    DECLARE @DepartmentSeed TABLE
    (
        departmentName nvarchar(100) NOT NULL PRIMARY KEY,
        description nvarchar(500) NULL,
        contactEmail nvarchar(150) NOT NULL,
        regionName nvarchar(100) NULL
    );

    INSERT INTO @DepartmentSeed
        (departmentName, description, contactEmail, regionName)
    VALUES
        (N'Roads & Infrastructure', N'Maintains public roads, sidewalks, bridges and related infrastructure.', N'roads@ocsp.local', N'Bawshar'),
        (N'Water & Drainage', N'Responds to public water leaks, drainage faults and flooding risks.', N'water@ocsp.local', N'Bawshar'),
        (N'Waste Management', N'Coordinates waste collection, recycling and illegal-dumping response.', N'waste@ocsp.local', N'Seeb'),
        (N'Street Lighting', N'Maintains municipal streetlights and public-area electrical fixtures.', N'lighting@ocsp.local', N'Muttrah'),
        (N'Parks & Public Spaces', N'Maintains parks, playgrounds, landscaping and public recreation areas.', N'parks@ocsp.local', N'Nizwa'),
        (N'Traffic & Road Safety', N'Manages traffic signals, crossings and municipal road-safety concerns.', N'traffic@ocsp.local', N'Muttrah');

    INSERT INTO dbo.Departments
        (departmentName, description, contactEmail, regionId)
    SELECT
        seed.departmentName,
        seed.description,
        seed.contactEmail,
        region.regionId
    FROM @DepartmentSeed AS seed
    LEFT JOIN dbo.Regions AS region
        ON region.regionName = seed.regionName
    WHERE NOT EXISTS
    (
        SELECT 1
        FROM dbo.Departments AS existing
        WHERE existing.departmentName = seed.departmentName
    );

    UPDATE existing
    SET
        existing.description = seed.description,
        existing.contactEmail = seed.contactEmail,
        existing.regionId = region.regionId
    FROM dbo.Departments AS existing
    INNER JOIN @DepartmentSeed AS seed
        ON seed.departmentName = existing.departmentName
    LEFT JOIN dbo.Regions AS region
        ON region.regionName = seed.regionName;

    /* ---------------------------------------------------------------------
       3. Categories - the category determines the assigned department
       --------------------------------------------------------------------- */

    DECLARE @CategorySeed TABLE
    (
        categoryName nvarchar(100) NOT NULL PRIMARY KEY,
        description nvarchar(300) NULL,
        departmentName nvarchar(100) NOT NULL
    );

    INSERT INTO @CategorySeed
        (categoryName, description, departmentName)
    VALUES
        (N'Potholes & Road Damage', N'Potholes, damaged asphalt and unsafe road surfaces.', N'Roads & Infrastructure'),
        (N'Damaged Sidewalks', N'Broken paving, unsafe curbs and inaccessible pedestrian paths.', N'Roads & Infrastructure'),
        (N'Water Leaks', N'Visible leaks from public water pipes or municipal connections.', N'Water & Drainage'),
        (N'Drainage & Flooding', N'Blocked drains, standing water and local flood risks.', N'Water & Drainage'),
        (N'Missed Waste Collection', N'Missed scheduled collections or overflowing public containers.', N'Waste Management'),
        (N'Illegal Dumping', N'Waste abandoned outside approved municipal collection points.', N'Waste Management'),
        (N'Streetlight Outage', N'Dark, damaged or flickering municipal streetlights.', N'Street Lighting'),
        (N'Park Maintenance', N'Damaged equipment, irrigation problems or unsafe park facilities.', N'Parks & Public Spaces'),
        (N'Traffic Signals', N'Malfunctioning signals or unsafe traffic-signal timing.', N'Traffic & Road Safety'),
        (N'Pedestrian Crossings', N'Faded, damaged or unsafe pedestrian crossing facilities.', N'Traffic & Road Safety');

    INSERT INTO dbo.Categories
        (categoryName, description, departmentId)
    SELECT
        seed.categoryName,
        seed.description,
        department.departmentId
    FROM @CategorySeed AS seed
    INNER JOIN dbo.Departments AS department
        ON department.departmentName = seed.departmentName
    WHERE NOT EXISTS
    (
        SELECT 1
        FROM dbo.Categories AS existing
        WHERE existing.categoryName = seed.categoryName
    );

    UPDATE existing
    SET
        existing.description = seed.description,
        existing.departmentId = department.departmentId
    FROM dbo.Categories AS existing
    INNER JOIN @CategorySeed AS seed
        ON seed.categoryName = existing.categoryName
    INNER JOIN dbo.Departments AS department
        ON department.departmentName = seed.departmentName;

    /* ---------------------------------------------------------------------
       4. Login-ready users
       --------------------------------------------------------------------- */

    DECLARE @UserSeed TABLE
    (
        fullName nvarchar(100) NOT NULL,
        email nvarchar(150) NOT NULL PRIMARY KEY,
        phoneNumber nvarchar(20) NULL,
        role nvarchar(20) NOT NULL,
        regionName nvarchar(100) NULL,
        departmentName nvarchar(100) NULL,
        registeredDaysAgo int NOT NULL
    );

    INSERT INTO @UserSeed
        (fullName, email, phoneNumber, role, regionName, departmentName, registeredDaysAgo)
    VALUES
        (N'OCSP Demo Administrator', N'admin.demo@ocsp.local', N'+96890000001', N'Admin', N'Bawshar', NULL, 120),
        (N'Faisal Al Balushi', N'staff.demo@ocsp.local', N'+96890000002', N'Staff', N'Bawshar', N'Roads & Infrastructure', 90),
        (N'Noor Al Harthi', N'citizen.demo@ocsp.local', N'+96890000003', N'Citizen', N'Bawshar', NULL, 60);

    INSERT INTO dbo.Users
        (fullName, email, passwordHash, phoneNumber, role, regionId, departmentId, registrationDate, isActive)
    SELECT
        seed.fullName,
        seed.email,
        @DemoPasswordHash,
        CASE
            WHEN seed.phoneNumber IS NULL
              OR EXISTS
                 (
                     SELECT 1
                     FROM dbo.Users AS phoneOwner
                     WHERE phoneOwner.phoneNumber = seed.phoneNumber
                 )
                THEN NULL
            ELSE seed.phoneNumber
        END,
        seed.role,
        region.regionId,
        department.departmentId,
        DATEADD(DAY, -seed.registeredDaysAgo, @SeedNow),
        CAST(1 AS bit)
    FROM @UserSeed AS seed
    LEFT JOIN dbo.Regions AS region
        ON region.regionName = seed.regionName
    LEFT JOIN dbo.Departments AS department
        ON department.departmentName = seed.departmentName
    WHERE NOT EXISTS
    (
        SELECT 1
        FROM dbo.Users AS existing
        WHERE existing.email = seed.email
    );

    UPDATE existing
    SET
        existing.fullName = seed.fullName,
        existing.passwordHash = @DemoPasswordHash,
        existing.phoneNumber =
            CASE
                WHEN seed.phoneNumber IS NULL THEN existing.phoneNumber
                WHEN existing.phoneNumber = seed.phoneNumber THEN seed.phoneNumber
                WHEN NOT EXISTS
                     (
                         SELECT 1
                         FROM dbo.Users AS phoneOwner
                         WHERE phoneOwner.phoneNumber = seed.phoneNumber
                           AND phoneOwner.userId <> existing.userId
                     )
                    THEN seed.phoneNumber
                ELSE existing.phoneNumber
            END,
        existing.role = seed.role,
        existing.regionId = region.regionId,
        existing.departmentId = department.departmentId,
        existing.isActive = CAST(1 AS bit)
    FROM dbo.Users AS existing
    INNER JOIN @UserSeed AS seed
        ON seed.email = existing.email
    LEFT JOIN dbo.Regions AS region
        ON region.regionName = seed.regionName
    LEFT JOIN dbo.Departments AS department
        ON department.departmentName = seed.departmentName;

    /* ---------------------------------------------------------------------
       5. Issues

       Eight issues belong to the demo citizen. Three additional issues are
       added to @ExistingCitizenEmail when that active Citizen exists.
       --------------------------------------------------------------------- */

    DECLARE @IssueSeed TABLE
    (
        title nvarchar(150) NOT NULL,
        reporterEmail nvarchar(150) NOT NULL,
        description nvarchar(2000) NOT NULL,
        location nvarchar(300) NOT NULL,
        latitude decimal(9,6) NULL,
        longitude decimal(9,6) NULL,
        priority nvarchar(20) NOT NULL,
        currentStatus nvarchar(20) NOT NULL,
        reportedDaysAgo int NOT NULL,
        categoryName nvarchar(100) NOT NULL,
        regionName nvarchar(100) NOT NULL,
        PRIMARY KEY (title, reporterEmail)
    );

    INSERT INTO @IssueSeed
        (title, reporterEmail, description, location, latitude, longitude, priority, currentStatus, reportedDaysAgo, categoryName, regionName)
    VALUES
        (N'Pothole on Al Khuwair Main Road', N'citizen.demo@ocsp.local', N'A deep pothole is forcing vehicles to change lanes suddenly near the service-road entrance.', N'Al Khuwair Main Road, Bawshar', 23.594500, 58.405900, N'High', N'Open', 2, N'Potholes & Road Damage', N'Bawshar'),
        (N'Streetlight outage near Muttrah Corniche', N'citizen.demo@ocsp.local', N'Three streetlights are not working along a busy pedestrian section of the corniche.', N'Muttrah Corniche, opposite the fish market', 23.620700, 58.568300, N'Medium', N'InProgress', 9, N'Streetlight Outage', N'Muttrah'),
        (N'Water leak beside residential block', N'citizen.demo@ocsp.local', N'Clean water has been flowing from a damaged connection and collecting beside the access road.', N'Al Hail North, Seeb', 23.605100, 58.213900, N'High', N'InProgress', 5, N'Water Leaks', N'Seeb'),
        (N'Overflowing waste containers in Seeb', N'citizen.demo@ocsp.local', N'Public waste containers have not been collected and bags are blocking part of the footpath.', N'Al Mawaleh South, Seeb', 23.638900, 58.184200, N'Medium', N'Open', 1, N'Missed Waste Collection', N'Seeb'),
        (N'Damaged pedestrian crossing near school', N'citizen.demo@ocsp.local', N'The crossing markings were badly faded and one warning sign was damaged near the school entrance.', N'Al Ghubrah, Bawshar', 23.588000, 58.382900, N'High', N'Resolved', 15, N'Pedestrian Crossings', N'Bawshar'),
        (N'Blocked drainage channel after rain', N'citizen.demo@ocsp.local', N'Debris blocked the roadside drainage channel and caused standing water after recent rain.', N'Ghala Industrial Area, Bawshar', 23.600300, 58.399100, N'High', N'Resolved', 30, N'Drainage & Flooding', N'Bawshar'),
        (N'Playground equipment needs repair', N'citizen.demo@ocsp.local', N'A loose safety rail and worn surface require inspection in the children''s play area.', N'Nizwa Public Park', 22.933300, 57.533300, N'Low', N'Open', 3, N'Park Maintenance', N'Nizwa'),
        (N'Traffic signal timing causes congestion', N'citizen.demo@ocsp.local', N'The green phase was too short during the evening peak and traffic backed into the roundabout.', N'Al Wadi Al Kabir junction, Muttrah', 23.615600, 58.590000, N'Medium', N'Resolved', 12, N'Traffic Signals', N'Muttrah'),
        (N'Uneven pavement near community entrance', @ExistingCitizenEmail, N'The pavement edge is raised and presents a trip hazard near the community entrance.', N'Al Khuwair community entrance, Bawshar', 23.597800, 58.414200, N'Medium', N'Open', 2, N'Damaged Sidewalks', N'Bawshar'),
        (N'Streetlight flickering near home', @ExistingCitizenEmail, N'The streetlight switches on and off repeatedly throughout the evening.', N'Residential Street 18, Bawshar', 23.586900, 58.412800, N'Low', N'InProgress', 4, N'Streetlight Outage', N'Bawshar'),
        (N'Waste collection missed this week', @ExistingCitizenEmail, N'The scheduled collection was missed and the shared container became full.', N'Al Khuwair residential block, Bawshar', 23.596100, 58.409500, N'Medium', N'Resolved', 10, N'Missed Waste Collection', N'Bawshar');

    INSERT INTO dbo.Issues
        (title, description, location, latitude, longitude, priority, currentStatus, reportedDate, reportedById, categoryId, regionId, assignedDepartmentId)
    SELECT
        seed.title,
        seed.description,
        seed.location,
        seed.latitude,
        seed.longitude,
        seed.priority,
        seed.currentStatus,
        DATEADD(DAY, -seed.reportedDaysAgo, @SeedNow),
        reporter.userId,
        category.categoryId,
        region.regionId,
        category.departmentId
    FROM @IssueSeed AS seed
    INNER JOIN dbo.Users AS reporter
        ON reporter.email = seed.reporterEmail
       AND reporter.role = N'Citizen'
       AND reporter.isActive = CAST(1 AS bit)
    INNER JOIN dbo.Categories AS category
        ON category.categoryName = seed.categoryName
    INNER JOIN dbo.Regions AS region
        ON region.regionName = seed.regionName
    WHERE NOT EXISTS
    (
        SELECT 1
        FROM dbo.Issues AS existing
        WHERE existing.title = seed.title
          AND existing.reportedById = reporter.userId
    );

    /* ---------------------------------------------------------------------
       6. Status history
       --------------------------------------------------------------------- */

    DECLARE @StatusSeed TABLE
    (
        issueTitle nvarchar(150) NOT NULL,
        reporterEmail nvarchar(150) NOT NULL,
        updatedByEmail nvarchar(150) NOT NULL,
        previousStatus int NOT NULL,
        newStatus int NOT NULL,
        notes nvarchar(500) NOT NULL,
        updatedHoursAgo int NOT NULL
    );

    INSERT INTO @StatusSeed
        (issueTitle, reporterEmail, updatedByEmail, previousStatus, newStatus, notes, updatedHoursAgo)
    VALUES
        (N'Streetlight outage near Muttrah Corniche', N'citizen.demo@ocsp.local', N'staff.demo@ocsp.local', 0, 1, N'Electrical maintenance team assigned and replacement parts requested.', 168),
        (N'Water leak beside residential block', N'citizen.demo@ocsp.local', N'staff.demo@ocsp.local', 0, 1, N'Leak isolated and excavation scheduled with the water response team.', 72),
        (N'Damaged pedestrian crossing near school', N'citizen.demo@ocsp.local', N'staff.demo@ocsp.local', 0, 1, N'Road-safety crew scheduled repainting outside school hours.', 312),
        (N'Damaged pedestrian crossing near school', N'citizen.demo@ocsp.local', N'staff.demo@ocsp.local', 1, 2, N'Crossing repainted and damaged warning sign replaced.', 24),
        (N'Blocked drainage channel after rain', N'citizen.demo@ocsp.local', N'staff.demo@ocsp.local', 0, 1, N'Drainage inspection completed and cleaning crew dispatched.', 600),
        (N'Blocked drainage channel after rain', N'citizen.demo@ocsp.local', N'staff.demo@ocsp.local', 1, 2, N'Channel cleared and water flow tested successfully.', 480),
        (N'Traffic signal timing causes congestion', N'citizen.demo@ocsp.local', N'staff.demo@ocsp.local', 0, 1, N'Traffic engineers reviewed peak-hour timing data.', 240),
        (N'Traffic signal timing causes congestion', N'citizen.demo@ocsp.local', N'staff.demo@ocsp.local', 1, 2, N'Updated timing plan deployed and junction flow verified.', 2),
        (N'Streetlight flickering near home', @ExistingCitizenEmail, N'staff.demo@ocsp.local', 0, 1, N'Fault confirmed and a lighting technician assigned.', 48),
        (N'Waste collection missed this week', @ExistingCitizenEmail, N'staff.demo@ocsp.local', 0, 1, N'Missed route confirmed with the collection contractor.', 192),
        (N'Waste collection missed this week', @ExistingCitizenEmail, N'staff.demo@ocsp.local', 1, 2, N'Container collected and the regular route restored.', 1);

    INSERT INTO dbo.StatusUpdates
        (issueId, updatedById, previousStatus, newStatus, notes, updatedAt)
    SELECT
        issue.issueId,
        updater.userId,
        seed.previousStatus,
        seed.newStatus,
        seed.notes,
        DATEADD(HOUR, -seed.updatedHoursAgo, @SeedNow)
    FROM @StatusSeed AS seed
    INNER JOIN dbo.Users AS reporter
        ON reporter.email = seed.reporterEmail
    INNER JOIN dbo.Issues AS issue
        ON issue.title = seed.issueTitle
       AND issue.reportedById = reporter.userId
    INNER JOIN dbo.Users AS updater
        ON updater.email = seed.updatedByEmail
    WHERE NOT EXISTS
    (
        SELECT 1
        FROM dbo.StatusUpdates AS existing
        WHERE existing.issueId = issue.issueId
          AND existing.previousStatus = seed.previousStatus
          AND existing.newStatus = seed.newStatus
          AND existing.notes = seed.notes
    );

    /* ---------------------------------------------------------------------
       7. Citizen/staff comment conversations
       --------------------------------------------------------------------- */

    DECLARE @CommentSeed TABLE
    (
        issueTitle nvarchar(150) NOT NULL,
        reporterEmail nvarchar(150) NOT NULL,
        authorEmail nvarchar(150) NOT NULL,
        content nvarchar(1000) NOT NULL,
        commentHoursAgo int NOT NULL
    );

    INSERT INTO @CommentSeed
        (issueTitle, reporterEmail, authorEmail, content, commentHoursAgo)
    VALUES
        (N'Pothole on Al Khuwair Main Road', N'citizen.demo@ocsp.local', N'citizen.demo@ocsp.local', N'The pothole is getting wider and is difficult to see at night.', 36),
        (N'Pothole on Al Khuwair Main Road', N'citizen.demo@ocsp.local', N'staff.demo@ocsp.local', N'Thank you. The roads team has added this location to the urgent inspection route.', 18),
        (N'Streetlight outage near Muttrah Corniche', N'citizen.demo@ocsp.local', N'staff.demo@ocsp.local', N'The fault has been confirmed. Replacement components are being prepared.', 144),
        (N'Water leak beside residential block', N'citizen.demo@ocsp.local', N'citizen.demo@ocsp.local', N'Water is now reaching the edge of the parking area.', 96),
        (N'Water leak beside residential block', N'citizen.demo@ocsp.local', N'staff.demo@ocsp.local', N'The supply has been isolated safely while repairs are arranged.', 66),
        (N'Damaged pedestrian crossing near school', N'citizen.demo@ocsp.local', N'staff.demo@ocsp.local', N'The repainting and sign replacement have been completed.', 23),
        (N'Damaged pedestrian crossing near school', N'citizen.demo@ocsp.local', N'citizen.demo@ocsp.local', N'The new markings are clear. Thank you for completing the work.', 20),
        (N'Traffic signal timing causes congestion', N'citizen.demo@ocsp.local', N'staff.demo@ocsp.local', N'The revised signal plan is active and will continue to be monitored.', 2),
        (N'Streetlight flickering near home', @ExistingCitizenEmail, N'staff.demo@ocsp.local', N'A technician will test the lamp and electrical connection during the next evening shift.', 36),
        (N'Waste collection missed this week', @ExistingCitizenEmail, N'staff.demo@ocsp.local', N'The collection contractor has completed the missed pickup.', 1);

    INSERT INTO dbo.Comments
        (issueId, userId, content, isStaffComment, commentDate)
    SELECT
        issue.issueId,
        author.userId,
        seed.content,
        CASE WHEN author.role IN (N'Staff', N'Admin') THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END,
        DATEADD(HOUR, -seed.commentHoursAgo, @SeedNow)
    FROM @CommentSeed AS seed
    INNER JOIN dbo.Users AS reporter
        ON reporter.email = seed.reporterEmail
    INNER JOIN dbo.Issues AS issue
        ON issue.title = seed.issueTitle
       AND issue.reportedById = reporter.userId
    INNER JOIN dbo.Users AS author
        ON author.email = seed.authorEmail
    WHERE NOT EXISTS
    (
        SELECT 1
        FROM dbo.Comments AS existing
        WHERE existing.issueId = issue.issueId
          AND existing.userId = author.userId
          AND existing.content = seed.content
    );

    /* ---------------------------------------------------------------------
       8. Image attachments using files that already exist in Frontend/assets
       --------------------------------------------------------------------- */

    DECLARE @AttachmentSeed TABLE
    (
        issueTitle nvarchar(150) NOT NULL,
        reporterEmail nvarchar(150) NOT NULL,
        uploadedByEmail nvarchar(150) NOT NULL,
        fileUrl nvarchar(300) NOT NULL,
        fileType nvarchar(20) NOT NULL,
        uploadedHoursAgo int NOT NULL
    );

    INSERT INTO @AttachmentSeed
        (issueTitle, reporterEmail, uploadedByEmail, fileUrl, fileType, uploadedHoursAgo)
    VALUES
        (N'Pothole on Al Khuwair Main Road', N'citizen.demo@ocsp.local', N'citizen.demo@ocsp.local', N'http://localhost:4200/assets/images/cards/pothole.webp', N'Image', 46),
        (N'Streetlight outage near Muttrah Corniche', N'citizen.demo@ocsp.local', N'citizen.demo@ocsp.local', N'http://localhost:4200/assets/images/cards/streetlight.jpg', N'Image', 210),
        (N'Water leak beside residential block', N'citizen.demo@ocsp.local', N'citizen.demo@ocsp.local', N'http://localhost:4200/assets/images/cards/water-leak.webp', N'Image', 118),
        (N'Damaged pedestrian crossing near school', N'citizen.demo@ocsp.local', N'citizen.demo@ocsp.local', N'http://localhost:4200/assets/images/cards/crosswalk.jpg', N'Image', 358),
        (N'Traffic signal timing causes congestion', N'citizen.demo@ocsp.local', N'citizen.demo@ocsp.local', N'http://localhost:4200/assets/images/cards/traffic-light.webp', N'Image', 286),
        (N'Streetlight flickering near home', @ExistingCitizenEmail, @ExistingCitizenEmail, N'http://localhost:4200/assets/images/cards/streetlight.jpg', N'Image', 94);

    INSERT INTO dbo.Attachments
        (issueId, uploadedById, fileUrl, fileType, uploadedAt)
    SELECT
        issue.issueId,
        uploader.userId,
        seed.fileUrl,
        seed.fileType,
        DATEADD(HOUR, -seed.uploadedHoursAgo, @SeedNow)
    FROM @AttachmentSeed AS seed
    INNER JOIN dbo.Users AS reporter
        ON reporter.email = seed.reporterEmail
    INNER JOIN dbo.Issues AS issue
        ON issue.title = seed.issueTitle
       AND issue.reportedById = reporter.userId
    INNER JOIN dbo.Users AS uploader
        ON uploader.email = seed.uploadedByEmail
    WHERE NOT EXISTS
    (
        SELECT 1
        FROM dbo.Attachments AS existing
        WHERE existing.issueId = issue.issueId
          AND existing.fileUrl = seed.fileUrl
    );

    /* ---------------------------------------------------------------------
       9. Ratings - only Resolved issues may be rated
       --------------------------------------------------------------------- */

    DECLARE @RatingSeed TABLE
    (
        issueTitle nvarchar(150) NOT NULL,
        reporterEmail nvarchar(150) NOT NULL,
        score int NOT NULL,
        feedback nvarchar(500) NULL,
        ratedHoursAgo int NOT NULL
    );

    INSERT INTO @RatingSeed
        (issueTitle, reporterEmail, score, feedback, ratedHoursAgo)
    VALUES
        (N'Damaged pedestrian crossing near school', N'citizen.demo@ocsp.local', 5, N'The response was clear and the crossing is much safer now.', 18),
        (N'Traffic signal timing causes congestion', N'citizen.demo@ocsp.local', 4, N'Traffic flow improved noticeably during the evening peak.', 1),
        (N'Waste collection missed this week', @ExistingCitizenEmail, 4, N'The missed collection was resolved quickly after the report.', 1);

    INSERT INTO dbo.Ratings
        (issueId, userId, score, feedback, ratedAt)
    SELECT
        issue.issueId,
        reporter.userId,
        seed.score,
        seed.feedback,
        DATEADD(HOUR, -seed.ratedHoursAgo, @SeedNow)
    FROM @RatingSeed AS seed
    INNER JOIN dbo.Users AS reporter
        ON reporter.email = seed.reporterEmail
    INNER JOIN dbo.Issues AS issue
        ON issue.title = seed.issueTitle
       AND issue.reportedById = reporter.userId
       AND issue.currentStatus = N'Resolved'
    WHERE NOT EXISTS
    (
        SELECT 1
        FROM dbo.Ratings AS existing
        WHERE existing.issueId = issue.issueId
          AND existing.userId = reporter.userId
    );

    /* ---------------------------------------------------------------------
       10. Notifications
       --------------------------------------------------------------------- */

    -- Every seeded issue starts with the same Assignment notification that
    -- IssueService.Create produces for a normal API-created issue.
    INSERT INTO dbo.Notifications
        (userId, issueId, message, [type], isRead, createdAt)
    SELECT
        issue.reportedById,
        issue.issueId,
        N'Your issue report was received and is now Open.',
        N'Assignment',
        CASE WHEN issue.currentStatus = N'Open' THEN CAST(0 AS bit) ELSE CAST(1 AS bit) END,
        DATEADD(MINUTE, 1, issue.reportedDate)
    FROM dbo.Issues AS issue
    INNER JOIN @IssueSeed AS seed
        ON seed.title = issue.title
    INNER JOIN dbo.Users AS reporter
        ON reporter.userId = issue.reportedById
       AND reporter.email = seed.reporterEmail
    WHERE NOT EXISTS
    (
        SELECT 1
        FROM dbo.Notifications AS existing
        WHERE existing.userId = issue.reportedById
          AND existing.issueId = issue.issueId
          AND existing.[type] = N'Assignment'
          AND existing.message = N'Your issue report was received and is now Open.'
    );

    -- Add a current-status notification for every seeded issue that progressed.
    INSERT INTO dbo.Notifications
        (userId, issueId, message, [type], isRead, createdAt)
    SELECT
        issue.reportedById,
        issue.issueId,
        N'Your issue ''' + issue.title + N''' status changed to ' + issue.currentStatus + N'.',
        N'StatusChange',
        CASE
            WHEN latest.updatedAt >= DATEADD(HOUR, -6, @SeedNow) THEN CAST(0 AS bit)
            ELSE CAST(1 AS bit)
        END,
        latest.updatedAt
    FROM dbo.Issues AS issue
    INNER JOIN @IssueSeed AS seed
        ON seed.title = issue.title
    INNER JOIN dbo.Users AS reporter
        ON reporter.userId = issue.reportedById
       AND reporter.email = seed.reporterEmail
    CROSS APPLY
    (
        SELECT MAX(statusUpdate.updatedAt) AS updatedAt
        FROM dbo.StatusUpdates AS statusUpdate
        WHERE statusUpdate.issueId = issue.issueId
    ) AS latest
    WHERE issue.currentStatus IN (N'InProgress', N'Resolved')
      AND latest.updatedAt IS NOT NULL
      AND NOT EXISTS
      (
          SELECT 1
          FROM dbo.Notifications AS existing
          WHERE existing.userId = issue.reportedById
            AND existing.issueId = issue.issueId
            AND existing.[type] = N'StatusChange'
            AND existing.message = N'Your issue ''' + issue.title + N''' status changed to ' + issue.currentStatus + N'.'
      );

    -- Notify citizens about selected staff replies.
    INSERT INTO dbo.Notifications
        (userId, issueId, message, [type], isRead, createdAt)
    SELECT
        issue.reportedById,
        issue.issueId,
        N'A staff member commented on your issue ''' + issue.title + N'''.',
        N'Comment',
        CAST(0 AS bit),
        latestComment.commentDate
    FROM dbo.Issues AS issue
    INNER JOIN @IssueSeed AS seed
        ON seed.title = issue.title
    INNER JOIN dbo.Users AS reporter
        ON reporter.userId = issue.reportedById
       AND reporter.email = seed.reporterEmail
    CROSS APPLY
    (
        SELECT MAX(comment.commentDate) AS commentDate
        FROM dbo.Comments AS comment
        WHERE comment.issueId = issue.issueId
          AND comment.isStaffComment = CAST(1 AS bit)
    ) AS latestComment
    WHERE latestComment.commentDate IS NOT NULL
      AND NOT EXISTS
      (
          SELECT 1
          FROM dbo.Notifications AS existing
          WHERE existing.userId = issue.reportedById
            AND existing.issueId = issue.issueId
            AND existing.[type] = N'Comment'
            AND existing.message = N'A staff member commented on your issue ''' + issue.title + N'''.'
      );

    -- Staff receives assignments for the Roads & Infrastructure demo work.
    INSERT INTO dbo.Notifications
        (userId, issueId, message, [type], isRead, createdAt)
    SELECT
        staff.userId,
        issue.issueId,
        N'Issue ''' + issue.title + N''' is assigned to Roads & Infrastructure.',
        N'Assignment',
        CAST(0 AS bit),
        DATEADD(MINUTE, 5, issue.reportedDate)
    FROM dbo.Users AS staff
    CROSS JOIN dbo.Issues AS issue
    INNER JOIN dbo.Departments AS department
        ON department.departmentId = issue.assignedDepartmentId
    INNER JOIN @IssueSeed AS seed
        ON seed.title = issue.title
    INNER JOIN dbo.Users AS reporter
        ON reporter.userId = issue.reportedById
       AND reporter.email = seed.reporterEmail
    WHERE staff.email = N'staff.demo@ocsp.local'
      AND department.departmentName = N'Roads & Infrastructure'
      AND NOT EXISTS
      (
          SELECT 1
          FROM dbo.Notifications AS existing
          WHERE existing.userId = staff.userId
            AND existing.issueId = issue.issueId
            AND existing.[type] = N'Assignment'
            AND existing.message = N'Issue ''' + issue.title + N''' is assigned to Roads & Infrastructure.'
      );

    -- General role-specific notifications use a NULL issueId.
    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.Notifications AS notification
        INNER JOIN dbo.Users AS recipient
            ON recipient.userId = notification.userId
        WHERE recipient.email = N'admin.demo@ocsp.local'
          AND notification.issueId IS NULL
          AND notification.[type] = N'Assignment'
          AND notification.message = N'Platform demo data is ready for administrative review.'
    )
    BEGIN
        INSERT INTO dbo.Notifications
            (userId, issueId, message, [type], isRead, createdAt)
        SELECT
            userId,
            NULL,
            N'Platform demo data is ready for administrative review.',
            N'Assignment',
            CAST(0 AS bit),
            @SeedNow
        FROM dbo.Users
        WHERE email = N'admin.demo@ocsp.local';
    END;

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.Notifications AS notification
        INNER JOIN dbo.Users AS recipient
            ON recipient.userId = notification.userId
        WHERE recipient.email = N'staff.demo@ocsp.local'
          AND notification.issueId IS NULL
          AND notification.[type] = N'Assignment'
          AND notification.message = N'New civic reports are ready for staff review.'
    )
    BEGIN
        INSERT INTO dbo.Notifications
            (userId, issueId, message, [type], isRead, createdAt)
        SELECT
            userId,
            NULL,
            N'New civic reports are ready for staff review.',
            N'Assignment',
            CAST(0 AS bit),
            @SeedNow
        FROM dbo.Users
        WHERE email = N'staff.demo@ocsp.local';
    END;

    COMMIT TRANSACTION;

    /* Summary returned by SSMS/sqlcmd after a successful seed. */
    SELECT N'Regions' AS entity, COUNT(*) AS totalRows FROM dbo.Regions
    UNION ALL SELECT N'Departments', COUNT(*) FROM dbo.Departments
    UNION ALL SELECT N'Categories', COUNT(*) FROM dbo.Categories
    UNION ALL SELECT N'Users', COUNT(*) FROM dbo.Users
    UNION ALL SELECT N'Issues', COUNT(*) FROM dbo.Issues
    UNION ALL SELECT N'StatusUpdates', COUNT(*) FROM dbo.StatusUpdates
    UNION ALL SELECT N'Comments', COUNT(*) FROM dbo.Comments
    UNION ALL SELECT N'Attachments', COUNT(*) FROM dbo.Attachments
    UNION ALL SELECT N'Notifications', COUNT(*) FROM dbo.Notifications
    UNION ALL SELECT N'Ratings', COUNT(*) FROM dbo.Ratings;

    SELECT
        fullName,
        email,
        role,
        N'OCSP-Demo-2026!' AS demoPassword
    FROM dbo.Users
    WHERE email IN
    (
        N'admin.demo@ocsp.local',
        N'staff.demo@ocsp.local',
        N'citizen.demo@ocsp.local'
    )
    ORDER BY
        CASE role WHEN N'Admin' THEN 1 WHEN N'Staff' THEN 2 ELSE 3 END;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
GO
