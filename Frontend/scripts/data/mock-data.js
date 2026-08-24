(function initializeOcspMockData(global) {
  "use strict";

  const ocsp = global.OCSP || {};

  ocsp.mockData = {
    currentUser: {
      userId: 17,
      name: "Ahmed Al-Harthy",
      email: "ahmed@example.om",
      phoneNumber: "+968 9123 4567",
      role: "Citizen",
      regionId: 1,
      departmentId: null,
      registrationDate: "2026-05-14T09:30:00+04:00",
      isActive: true
    },
    notifications: [
      {
        notificationId: 901,
        userId: 17,
        issueId: 103,
        message: "Your water leak report is now in progress.",
        type: "StatusChange",
        isRead: false,
        createdAt: "2026-08-11T10:35:00+04:00"
      },
      {
        notificationId: 902,
        userId: 17,
        issueId: 104,
        message: "Your streetlight report has been resolved.",
        type: "StatusChange",
        isRead: false,
        createdAt: "2026-08-11T12:30:00+04:00"
      }
    ],
    categories: [
      {
        categoryId: 1,
        categoryName: "Potholes & Asphalt",
        description: "Road-surface damage and asphalt maintenance.",
        departmentId: 11,
        departmentName: "Roads & Infrastructure",
        issueCount: 1
      },
      {
        categoryId: 2,
        categoryName: "Street Lighting",
        description: "Streetlight outages and lighting hazards.",
        departmentId: 12,
        departmentName: "Municipal Lighting",
        issueCount: 1
      },
      {
        categoryId: 3,
        categoryName: "Water & Drainage",
        description: "Leaks, drainage, and public water infrastructure.",
        departmentId: 13,
        departmentName: "Water Services",
        issueCount: 1
      },
      {
        categoryId: 4,
        categoryName: "Public Facilities",
        description: "Parks, public buildings, and community facilities.",
        departmentId: 14,
        departmentName: "Parks & Public Facilities",
        issueCount: 0
      },
      {
        categoryId: 5,
        categoryName: "Road Safety",
        description: "Crossings, road signs, and traffic-safety concerns.",
        departmentId: 15,
        departmentName: "Traffic & Signals",
        issueCount: 1
      }
    ],
    regions: [
      { regionId: 1, regionName: "Bawshar", governorate: "Muscat" },
      { regionId: 2, regionName: "Seeb", governorate: "Muscat" },
      { regionId: 3, regionName: "Muttrah", governorate: "Muscat" },
      { regionId: 4, regionName: "Salalah", governorate: "Dhofar" }
    ],
    issues: [
      {
        issueId: 101,
        title: "Pothole on Main Access Road",
        description: "A deep pothole is forming near the entrance to the service road. Vehicles are swerving around it during peak hours and the damaged area is becoming wider.",
        location: "Al Ghubrah Main Access Road, Muscat",
        latitude: 23.5881,
        longitude: 58.4084,
        priority: "High",
        currentStatus: "Open",
        reportedDate: "2026-08-09T08:42:00+04:00",
        reportedById: 17,
        categoryName: "Potholes & Asphalt",
        regionName: "Bawshar",
        assignedDepartmentName: "Roads & Infrastructure",
        ui: {
          imageUrl: "../assets/images/cards/pothole.webp",
          imageAlt: "Pothole on a paved road",
          imageStyle: "document",
          previewLabel: "Latest: Location",
          mapAreaName: "Al Ghubrah",
          mapVariant: "city",
          hasFreshUpdate: false
        }
      },
      {
        issueId: 102,
        title: "Damaged Pedestrian Crossing Sign",
        description: "The pedestrian crossing sign beside the school is bent and the road marking has faded, making the crossing difficult for drivers to see.",
        location: "Al Khuwair School Zone, Muscat",
        latitude: 23.5965,
        longitude: 58.4321,
        priority: "Medium",
        currentStatus: "Open",
        reportedDate: "2026-08-08T16:18:00+04:00",
        reportedById: 17,
        categoryName: "Road Safety",
        regionName: "Bawshar",
        assignedDepartmentName: "Traffic & Signals",
        ui: {
          imageUrl: "../assets/images/cards/crosswalk.jpg",
          imageAlt: "Pedestrian crossing beside a road",
          imageStyle: "road",
          previewLabel: "Latest: Crossing",
          mapAreaName: "Al Khuwair",
          mapVariant: "city",
          hasFreshUpdate: false
        }
      },
      {
        issueId: 103,
        title: "Water Leak in Public Park",
        description: "Water is leaking continuously from an irrigation connection beside the walking path, creating a slippery surface and wasting water.",
        location: "East walking path, Al Khuwair Public Park",
        latitude: 23.5992,
        longitude: 58.4287,
        priority: "High",
        currentStatus: "InProgress",
        reportedDate: "2026-08-07T14:16:00+04:00",
        reportedById: 17,
        categoryName: "Water & Drainage",
        regionName: "Bawshar",
        assignedDepartmentName: "Water Services",
        ui: {
          imageUrl: "../assets/images/cards/water-leak.webp",
          imageAlt: "Water leaking beside a public walking path",
          imageStyle: "document",
          previewLabel: "Latest: Path photo",
          mapAreaName: "Al Khuwair Park",
          mapVariant: "park",
          hasFreshUpdate: true,
          updateTitle: "Status changed: Open to In Progress",
          updateMessage: "A maintenance team has been assigned to inspect the irrigation line."
        }
      },
      {
        issueId: 104,
        title: "Broken Streetlight on Sultan Qaboos Street",
        description: "The streetlight near Intersection 4 had been completely out for three nights, causing visibility concerns for pedestrians crossing in the evening. The pole number is M-452.",
        location: "Sultan Qaboos Street, Muscat",
        latitude: 23.6044,
        longitude: 58.4552,
        priority: "Medium",
        currentStatus: "Resolved",
        reportedDate: "2026-08-07T08:45:00+04:00",
        reportedById: 17,
        categoryName: "Street Lighting",
        regionName: "Bawshar",
        assignedDepartmentName: "Municipal Lighting",
        ui: {
          imageUrl: "../assets/images/cards/streetlight.jpg",
          imageAlt: "Streetlight at night",
          imageStyle: "fixed",
          previewLabel: "Latest: After",
          mapAreaName: "Muscat",
          mapVariant: "city",
          hasFreshUpdate: true,
          updateTitle: "Status changed: In Progress to Resolved",
          updateMessage: "The repair was completed and verified by municipal staff."
        }
      }
    ],
    attachmentsByIssueId: {
      101: [
        { attachmentId: 1001, issueId: 101, fileName: "road-photo.webp", fileType: "Image", fileUrl: "../assets/images/cards/pothole.webp", uploadedById: 17, uploadedAt: "2026-08-09T08:43:00+04:00", label: "Road photo", style: "road" },
        { attachmentId: 1002, issueId: 101, fileName: "location.webp", fileType: "Image", fileUrl: "../assets/images/cards/pothole.webp", uploadedById: 17, uploadedAt: "2026-08-09T08:44:00+04:00", label: "Location", style: "document" }
      ],
      102: [
        { attachmentId: 1003, issueId: 102, fileName: "crossing.jpg", fileType: "Image", fileUrl: "../assets/images/cards/crosswalk.jpg", uploadedById: 17, uploadedAt: "2026-08-08T16:19:00+04:00", label: "Crossing", style: "road" }
      ],
      103: [
        { attachmentId: 1004, issueId: 103, fileName: "water-leak.webp", fileType: "Image", fileUrl: "../assets/images/cards/water-leak.webp", uploadedById: 17, uploadedAt: "2026-08-07T14:17:00+04:00", label: "Leak photo", style: "water" },
        { attachmentId: 1005, issueId: 103, fileName: "path.webp", fileType: "Image", fileUrl: "../assets/images/cards/water-leak.webp", uploadedById: 17, uploadedAt: "2026-08-07T14:18:00+04:00", label: "Path photo", style: "document" }
      ],
      104: [
        { attachmentId: 1006, issueId: 104, fileName: "before.jpg", fileType: "Image", fileUrl: "../assets/images/cards/streetlight.jpg", uploadedById: 17, uploadedAt: "2026-08-07T08:46:00+04:00", label: "Before", style: "night" },
        { attachmentId: 1007, issueId: 104, fileName: "after.jpg", fileType: "Image", fileUrl: "../assets/images/cards/streetlight.jpg", uploadedById: 22, uploadedAt: "2026-08-11T12:31:00+04:00", label: "After", style: "fixed" }
      ]
    },
    commentsByIssueId: {
      101: [
        { commentId: 2001, issueId: 101, userId: 17, userName: "Ahmed Al-Harthy", content: "Please review this location soon. The road is especially busy in the morning.", isStaffComment: false, commentDate: "2026-08-09T09:05:00+04:00" }
      ],
      102: [
        { commentId: 2002, issueId: 102, userId: 31, userName: "Municipality Admin", content: "Your issue was received and is queued for review.", isStaffComment: true, commentDate: "2026-08-09T08:20:00+04:00" }
      ],
      103: [
        { commentId: 2003, issueId: 103, userId: 32, userName: "Ahmed Al-Balushi", content: "A maintenance team has been assigned and is inspecting the irrigation line.", isStaffComment: true, commentDate: "2026-08-11T10:35:00+04:00", highlighted: true },
        { commentId: 2004, issueId: 103, userId: 17, userName: "Ahmed Al-Harthy", content: "Thank you for the update. Please let me know when the repair is complete.", isStaffComment: false, commentDate: "2026-08-11T10:48:00+04:00" }
      ],
      104: [
        { commentId: 2005, issueId: 104, userId: 33, userName: "Ahmed Al-Habsi", content: "The faulty bulb and wiring have been replaced. The streetlight is now operational.", isStaffComment: true, commentDate: "2026-08-11T13:15:00+04:00", highlighted: true },
        { commentId: 2006, issueId: 104, userId: 17, userName: "Ahmed Al-Harthy", content: "Thank you. I checked the streetlight and it is working correctly now.", isStaffComment: false, commentDate: "2026-08-11T13:26:00+04:00" }
      ]
    },
    statusUpdatesByIssueId: {
      101: [
        { statusUpdateId: 3001, issueId: 101, updatedById: 17, previousStatus: null, newStatus: "Open", notes: "Issue Submitted", updatedAt: "2026-08-09T08:42:00+04:00" }
      ],
      102: [
        { statusUpdateId: 3002, issueId: 102, updatedById: 17, previousStatus: null, newStatus: "Open", notes: "Issue Submitted", updatedAt: "2026-08-08T16:18:00+04:00" }
      ],
      103: [
        { statusUpdateId: 3003, issueId: 103, updatedById: 17, previousStatus: null, newStatus: "Open", notes: "Issue Submitted", updatedAt: "2026-08-07T14:16:00+04:00" },
        { statusUpdateId: 3004, issueId: 103, updatedById: 32, previousStatus: "Open", newStatus: "InProgress", notes: "Maintenance team assigned", updatedAt: "2026-08-11T10:35:00+04:00" }
      ],
      104: [
        { statusUpdateId: 3005, issueId: 104, updatedById: 17, previousStatus: null, newStatus: "Open", notes: "Issue Submitted", updatedAt: "2026-08-07T08:45:00+04:00" },
        { statusUpdateId: 3006, issueId: 104, updatedById: 33, previousStatus: "Open", newStatus: "InProgress", notes: "Repair scheduled", updatedAt: "2026-08-09T10:20:00+04:00" },
        { statusUpdateId: 3007, issueId: 104, updatedById: 33, previousStatus: "InProgress", newStatus: "Resolved", notes: "Repair completed", updatedAt: "2026-08-11T12:30:00+04:00" }
      ]
    },
    ratingsByIssueId: {
      104: null
    }
  };

  global.OCSP = ocsp;
})(window);
