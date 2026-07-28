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
        private EmailService emailService;
        private NotificationService notificationService;
        
        public IssueService(IssueRepo _issueRepo , CategoryRepo _categoryRepo, RegionRepo _regionRepo, UserRepo _userRepo, EmailService _emailService, NotificationService _notificationService)
        {
            issueRepo = _issueRepo;
            categoryRepo = _categoryRepo;    
            regionRepo = _regionRepo;
            userRepo = _userRepo;
            emailService = _emailService;
            notificationService = _notificationService;
        }

        //create Issue 
        public async Task<IssueResponseDto?> Create(CreateIssueDto dto, int reportedById)
        {
            // Validate user-chosen references before touching the entity
            Category? category = categoryRepo.GetCategoryById(dto.categoryId);
            if (category == null)
                return null;
            Region? region = regionRepo.GetById(dto.regionId);
            if (region == null)
                return null;

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
            response.assignedDepartmentName = issue.assignedDepartment?.departmentName;

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

        // Resolve Issue 
        //public bool ResolveIssue(int id)
        //{
        //    Issue issue = issueRepo.GetById(id);

        //    if (issue == null)
        //        return false;

        //    issue.currentStatus = IssueStatus.Resolved;
        //    issueRepo.Update();

        //    return true;
        //}
    }
}
