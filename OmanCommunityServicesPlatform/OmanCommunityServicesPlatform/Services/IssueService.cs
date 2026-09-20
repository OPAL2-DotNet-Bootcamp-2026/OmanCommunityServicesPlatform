using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Enums;
using OmanCommunityServicesPlatform.Models;
using OmanCommunityServicesPlatform.Models.Enums;
using OmanCommunityServicesPlatform.Repositories;

namespace OmanCommunityServicesPlatform.Services
{
    public class IssueService
    {
        private IssueRepo issueRepo;
        private CategoryRepo categoryRepo;
        private RegionRepo regionRepo;
        private UserRepo userRepo;
        private StatusUpdateRepo statusUpdateRepo;
        private EmailService emailService;
        private NotificationService notificationService;
        private ILogger<IssueService> logger;

        public IssueService(IssueRepo _issueRepo , CategoryRepo _categoryRepo, RegionRepo _regionRepo, UserRepo _userRepo, StatusUpdateRepo _statusUpdateRepo, EmailService _emailService, NotificationService _notificationService, ILogger<IssueService> _logger)
        {
            issueRepo = _issueRepo;
            categoryRepo = _categoryRepo;
            regionRepo = _regionRepo;
            userRepo = _userRepo;
            statusUpdateRepo = _statusUpdateRepo;
            emailService = _emailService;
            notificationService = _notificationService;
            logger = _logger;
        }

        //create Issue 
        public async Task<IssueResponseDto?> Create(CreateIssueDto dto, int reportedById)
        {
            // Validate user-chosen references before touching the entity
            Category? category = categoryRepo.GetCategoryById(dto.categoryId);
            if (category == null)
            {
                logger.LogWarning("Issue rejected: category {CategoryId} does not exist", dto.categoryId);
                return null;
            }
            Region? region = regionRepo.GetById(dto.regionId);
            if (region == null)
            {
                logger.LogWarning("Issue rejected: region {RegionId} does not exist", dto.regionId);
                return null;
            }

            Issue issue = new Issue();
            // User input
            issue.title = dto.title;
            issue.description = dto.description;
            issue.location = dto.location;
            issue.latitude = dto.latitude;
            issue.longitude = dto.longitude;
            issue.priority = dto.priority;
            // User-chosen references (validated above)
            issue.regionId = dto.regionId;
            issue.categoryId = dto.categoryId;

            issue.assignedDepartmentId = category.departmentId;
            // System values
            issue.reportedById = reportedById;
            issue.currentStatus = IssueStatus.Open;
            issue.reportedDate = DateTime.UtcNow;

            issueRepo.Add(issue);

            // Record the creation itself, so the activity timeline starts where
            // the issue starts instead of at the first status CHANGE. Without
            // this row an issue's Open period has no history at all.
            // previousStatus is a required, non-nullable enum, so a creation
            // record is Open -> Open; that is what identifies it as the
            // submission rather than a transition.
            StatusUpdate submission = new StatusUpdate
            {
                issueId = issue.issueId,
                previousStatus = IssueStatus.Open,
                newStatus = IssueStatus.Open,
                notes = "Issue reported.",
                updatedAt = issue.reportedDate,
                updatedById = reportedById
            };
            statusUpdateRepo.Add(submission);

            // The routing decision is the one people ask about later: "why did
            // my report go to that department?"
            logger.LogInformation(
                "Issue {IssueId} created by user {UserId} in category {CategoryId}, routed to department {DepartmentId}",
                issue.issueId, reportedById, issue.categoryId, issue.assignedDepartmentId);

            User? reporter = userRepo.GetById(reportedById);

            notificationService.CreateNotification(new CreateNotificationDTO
            {
                issueId = issue.issueId,
                message = "Your issue report was received and is now Open.",
                type = NotificationType.Assignment
            }, reportedById);

            if (reporter != null)
            {
                await emailService.SendEmailAsync(
                    reporter.email,
                    "Issue Received",
                    $"Hi {reporter.fullName}, your issue \"{issue.title}\" was received and is now Open."
                );
            }

            IssueResponseDto response = new IssueResponseDto();

            response.issueId = issue.issueId;
            response.title = issue.title;
            response.description = issue.description;
            response.location = issue.location;
            response.latitude = issue.latitude;
            response.longitude = issue.longitude;
            response.priority = issue.priority;
            response.currentStatus = issue.currentStatus;
            response.reportedDate = issue.reportedDate;
            response.reportedById = issue.reportedById;
            response.categoryName = category.categoryName;
            response.regionName = region.regionName;
            // Not issue.assignedDepartment - that navigation property is never
            // loaded on an entity constructed moments ago, so it was always
            // null here and the create response did not match the list
            // response. CategoryRepo.GetCategoryById includes the department.
            response.assignedDepartmentName = category.department?.departmentName;

            return response;
        }
        // Get All Issues
        public List<IssueResponseDto> GetAll()
        {
            List<Issue> issues = issueRepo.GetAll();

            List<IssueResponseDto> response = new List<IssueResponseDto>();

            foreach (Issue issue in issues)
            {
                IssueResponseDto dto = new IssueResponseDto();

                dto.issueId = issue.issueId;
                dto.title = issue.title;
                dto.description = issue.description;
                dto.location = issue.location;
                dto.latitude = issue.latitude;
                dto.longitude = issue.longitude;
                dto.priority = issue.priority;
                dto.currentStatus = issue.currentStatus;
                dto.reportedDate = issue.reportedDate;
                dto.reportedById = issue.reportedById;
                dto.categoryName = issue.category?.categoryName;
                dto.regionName = issue.region?.regionName;
                dto.assignedDepartmentName = issue.assignedDepartment?.departmentName;
                response.Add(dto);
            }

            return response;
        }
        // Get Issue By Id 
        public IssueResponseDto GetById(int id)
        {
            Issue issue = issueRepo.GetById(id);

            if (issue == null)
                return null;

            IssueResponseDto response = new IssueResponseDto();

            response.issueId = issue.issueId;
            response.title = issue.title;
            response.description = issue.description;
            response.location = issue.location;
            response.latitude = issue.latitude;
            response.longitude = issue.longitude;
            response.priority = issue.priority;
            response.currentStatus = issue.currentStatus;
            response.reportedDate = issue.reportedDate;
            response.reportedById = issue.reportedById;
            response.categoryName = issue.category?.categoryName;
            response.regionName = issue.region?.regionName;
            response.assignedDepartmentName = issue.assignedDepartment?.departmentName;
            return response;
        }
        // Citizen gets only an issue that belongs to them
        public IssueResponseDto? GetMyIssueById(int issueId, int reportedById)
        {
            Issue? issue = issueRepo.GetById(issueId);

            if (issue == null)
                return null;

            // The citizen can only view their own issue
            if (issue.reportedById != reportedById)
                return null;

            IssueResponseDto response = new IssueResponseDto();

            response.issueId = issue.issueId;
            response.title = issue.title;
            response.description = issue.description;
            response.location = issue.location;
            response.latitude = issue.latitude;
            response.longitude = issue.longitude;
            response.priority = issue.priority;
            response.currentStatus = issue.currentStatus;
            response.reportedDate = issue.reportedDate;
            response.reportedById = issue.reportedById;
            response.categoryName = issue.category?.categoryName;
            response.regionName = issue.region?.regionName;
            response.assignedDepartmentName = issue.assignedDepartment?.departmentName;

            return response;
        }
        //  Change Issue Status
        //public IssueResponseDto ChangeStatus(int id, ChangeIssueStatusDto dto)
        //{
        //    Issue issue = issueRepo.GetById(id);

        //    if (issue == null)
        //        return null;

        //    // Save the old status
        //    IssueStatus previousStatus = issue.currentStatus;
        //    // Change to the new status
        //    issue.currentStatus = dto.newStatus;
        //    // Create a history record
        //    StatusUpdate statusUpdate =new StatusUpdate();
        //    statusUpdate.issueId = issue.issueId;
        //    statusUpdate.previousStatus = previousStatus;
        //    statusUpdate.newStatus = dto.newStatus;
        //    statusUpdate.notes = dto.notes;
        //    statusUpdate.updatedAt = DateTime.UtcNow;

        //    statusUpdateRepo.Add(statusUpdate);
        //    issueRepo.Update();

        //    IssueResponseDto response = new IssueResponseDto();

        //    response.issueId = issue.issueId;
        //    response.title = issue.title;
        //    response.description = issue.description;
        //    response.location = issue.location;
        //    response.latitude = issue.latitude;
        //    response.longitude = issue.longitude;
        //    response.priority = issue.priority;
        //    response.currentStatus = issue.currentStatus;
        //    response.reportedDate = issue.reportedDate;
        //    response.categoryName = issue.category?.categoryName;
        //    response.regionName = issue.region?.regionName;
        //    response.assignedDepartmentName = issue.assignedDepartment?.departmentName;

        //    return response;
        //}
        // Get all issues created by a specific user
        public List<IssueResponseDto> GetByReportedById(int reportedById)
        {
            List<Issue> issues = issueRepo.GetByReportedById(reportedById);
            List<IssueResponseDto> response = new List<IssueResponseDto>();

            foreach (Issue issue in issues)
            {
                IssueResponseDto dto = new IssueResponseDto();

                dto.issueId = issue.issueId;
                dto.title = issue.title;
                dto.description = issue.description;
                dto.location = issue.location;
                dto.latitude = issue.latitude;
                dto.longitude = issue.longitude;
                dto.priority = issue.priority;
                dto.currentStatus = issue.currentStatus;
                dto.reportedDate = issue.reportedDate;
                dto.reportedById = issue.reportedById;
                dto.categoryName = issue.category?.categoryName;
                dto.regionName = issue.region?.regionName;
                dto.assignedDepartmentName = issue.assignedDepartment?.departmentName;

                response.Add(dto);
            }
            return response;
        }
        // Get Issues By Status
        public List<IssueResponseDto> GetIssueByStatus(IssueStatus status)
        {
            List<Issue> issues = issueRepo.GetIssueByStatus(status);

            List<IssueResponseDto> response = new List<IssueResponseDto>();

            foreach (Issue issue in issues)
            {
                IssueResponseDto dto = new IssueResponseDto();

                dto.issueId = issue.issueId;
                dto.title = issue.title;
                dto.description = issue.description;
                dto.location = issue.location;
                dto.latitude = issue.latitude;
                dto.longitude = issue.longitude;
                dto.priority = issue.priority;
                dto.currentStatus = issue.currentStatus;
                dto.reportedDate = issue.reportedDate;
                dto.reportedById = issue.reportedById;
                dto.categoryName = issue.category?.categoryName;
                dto.regionName = issue.region?.regionName;
                dto.assignedDepartmentName = issue.assignedDepartment?.departmentName;

                response.Add(dto);
            }

            return response;
        }


        // Get Issues By Priority
        public List<IssueResponseDto> GetIssueByPriority(IssuePriority priority)
        {
            List<Issue> issues = issueRepo.GetIssueByPriority(priority);

            List<IssueResponseDto> response = new List<IssueResponseDto>();

            foreach (Issue issue in issues)
            {
                IssueResponseDto dto = new IssueResponseDto();

                dto.issueId = issue.issueId;
                dto.title = issue.title;
                dto.description = issue.description;
                dto.location = issue.location;
                dto.latitude = issue.latitude;
                dto.longitude = issue.longitude;
                dto.priority = issue.priority;
                dto.currentStatus = issue.currentStatus;
                dto.reportedDate = issue.reportedDate;
                dto.reportedById = issue.reportedById;
                dto.categoryName = issue.category?.categoryName;
                dto.regionName = issue.region?.regionName;
                dto.assignedDepartmentName = issue.assignedDepartment?.departmentName;

                response.Add(dto);
            }

            return response;
        }


        // Get Issues By Category
        public List<IssueResponseDto> GetIssueByCategory(int categoryId)
        {
            List<Issue> issues = issueRepo.GetIssueByCategory(categoryId);

            List<IssueResponseDto> response = new List<IssueResponseDto>();

            foreach (Issue issue in issues)
            {
                IssueResponseDto dto = new IssueResponseDto();

                dto.issueId = issue.issueId;
                dto.title = issue.title;
                dto.description = issue.description;
                dto.location = issue.location;
                dto.latitude = issue.latitude;
                dto.longitude = issue.longitude;
                dto.priority = issue.priority;
                dto.currentStatus = issue.currentStatus;
                dto.reportedDate = issue.reportedDate;
                dto.reportedById = issue.reportedById;
                dto.categoryName = issue.category?.categoryName;
                dto.regionName = issue.region?.regionName;
                dto.assignedDepartmentName = issue.assignedDepartment?.departmentName;

                response.Add(dto);
            }

            return response;
        }


        // Get Issues By Department
        public List<IssueResponseDto> GetIssueByDepartment(int departmentId)
        {
            List<Issue> issues = issueRepo.GetIssueByDepartment(departmentId);

            List<IssueResponseDto> response = new List<IssueResponseDto>();

            foreach (Issue issue in issues)
            {
                IssueResponseDto dto = new IssueResponseDto();

                dto.issueId = issue.issueId;
                dto.title = issue.title;
                dto.description = issue.description;
                dto.location = issue.location;
                dto.latitude = issue.latitude;
                dto.longitude = issue.longitude;
                dto.priority = issue.priority;
                dto.currentStatus = issue.currentStatus;
                dto.reportedDate = issue.reportedDate;
                dto.reportedById = issue.reportedById;
                dto.categoryName = issue.category?.categoryName;
                dto.regionName = issue.region?.regionName;
                dto.assignedDepartmentName = issue.assignedDepartment?.departmentName;

                response.Add(dto);
            }

            return response;
        }


    }
}
