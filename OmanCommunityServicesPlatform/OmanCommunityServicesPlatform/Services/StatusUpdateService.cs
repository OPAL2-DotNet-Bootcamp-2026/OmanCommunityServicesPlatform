using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Enums;
using OmanCommunityServicesPlatform.Models;
using OmanCommunityServicesPlatform.Models.Enums;
using OmanCommunityServicesPlatform.Repositories;

namespace OmanCommunityServicesPlatform.Services
{
    public class StatusUpdateService
    {
        private readonly StatusUpdateRepo statusUpdateRepo;
        private readonly IssueRepo issueRepo;
        private readonly UserRepo userRepo;
        private readonly EmailService emailService;
        private readonly NotificationService notificationService;
        private readonly ILogger<StatusUpdateService> logger;

        public StatusUpdateService(
            StatusUpdateRepo _statusUpdateRepo,
            IssueRepo _issueRepo,
            UserRepo _userRepo,
            EmailService _emailService,
            NotificationService _notificationService,
            ILogger<StatusUpdateService> _logger)
        {
            statusUpdateRepo = _statusUpdateRepo;
            issueRepo = _issueRepo;
            userRepo = _userRepo;
            emailService = _emailService;
            notificationService = _notificationService;
            logger = _logger;
        }

        // Create Status Update
        public async Task<StatusUpdateResponseDto?> Create(CreateStatusUpdateDto dto , int userId)
        {
            Issue? issue = issueRepo.GetById(dto.issueId);

            if (issue == null)
            {
                logger.LogWarning("Status update failed: issue {IssueId} not found", dto.issueId);
                return null;
            }

            StatusUpdate statusUpdate = new StatusUpdate();

            statusUpdate.issueId = issue.issueId;
            statusUpdate.updatedById = userId;
            statusUpdate.previousStatus = issue.currentStatus;
            statusUpdate.newStatus = dto.newStatus;
            statusUpdate.notes = dto.notes;
            statusUpdate.updatedAt = DateTime.UtcNow;

            // Update issue current status
            issue.currentStatus = dto.newStatus;

            statusUpdateRepo.Add(statusUpdate);
            issueRepo.Update();

            logger.LogInformation(
                "Issue {IssueId} status changed from {PreviousStatus} to {NewStatus} by {UpdatedById}",
                issue.issueId, statusUpdate.previousStatus, statusUpdate.newStatus, userId);

            User? reporter = userRepo.GetById(issue.reportedById);

            string message = dto.newStatus == IssueStatus.Resolved
                ? "Your issue was resolved. Please rate the resolution."
                : $"Your issue status changed to {dto.newStatus}.";

            notificationService.CreateNotification(new CreateNotificationDTO
            {
                issueId = issue.issueId,
                message = message,
                type = NotificationType.StatusChange
            }, issue.reportedById);

            if (reporter != null)
            {
                await emailService.SendEmailAsync(
                    reporter.email,
                    "Issue Status Updated",
                    $"Hi {reporter.fullName}, your issue \"{issue.title}\" status changed to {dto.newStatus}." +
                    (dto.newStatus == IssueStatus.Resolved ? " Please rate the resolution when you have a moment." : "")
                );
            }

            StatusUpdateResponseDto response = new StatusUpdateResponseDto();

            response.statusUpdateId = statusUpdate.statusUpdateId;
            response.issueId = statusUpdate.issueId;
            response.updatedById = statusUpdate.updatedById;
            response.previousStatus = statusUpdate.previousStatus;
            response.newStatus = statusUpdate.newStatus;
            response.notes = statusUpdate.notes;
            response.updatedAt = statusUpdate.updatedAt;

            return response;
        }

        // Get All Status Updates
        public List<StatusUpdateResponseDto> GetAll()
        {
            List<StatusUpdate> updates = statusUpdateRepo.GetAll();

            List<StatusUpdateResponseDto> response = new List<StatusUpdateResponseDto>();

            foreach (StatusUpdate update in updates)
            {
                StatusUpdateResponseDto dto = new StatusUpdateResponseDto();

                dto.statusUpdateId = update.statusUpdateId;
                dto.issueId = update.issueId;
                dto.updatedById = update.updatedById;
                dto.previousStatus = update.previousStatus;
                dto.newStatus = update.newStatus;
                dto.notes = update.notes;
                dto.updatedAt = update.updatedAt;

                response.Add(dto);
            }

            return response;
        }

        // Get Status Update By Id
        public StatusUpdateResponseDto GetById(int id)
        {
            StatusUpdate? statusUpdate = statusUpdateRepo.GetById(id);

            if (statusUpdate == null)
                return null;

            StatusUpdateResponseDto response = new StatusUpdateResponseDto();

            response.statusUpdateId = statusUpdate.statusUpdateId;
            response.issueId = statusUpdate.issueId;
            response.updatedById = statusUpdate.updatedById;
            response.previousStatus = statusUpdate.previousStatus;
            response.newStatus = statusUpdate.newStatus;
            response.notes = statusUpdate.notes;
            response.updatedAt = statusUpdate.updatedAt;

            return response;
        }

        // Get Status Updates By Issue Id
        public List<StatusUpdateResponseDto> GetByIssueId(int issueId)
        {
            List<StatusUpdate> updates = statusUpdateRepo.GetByIssueId(issueId);

            List<StatusUpdateResponseDto> response = new List<StatusUpdateResponseDto>();

            foreach (StatusUpdate update in updates)
            {
                StatusUpdateResponseDto dto = new StatusUpdateResponseDto();

                dto.statusUpdateId = update.statusUpdateId;
                dto.issueId = update.issueId;
                dto.updatedById = update.updatedById;
                dto.previousStatus = update.previousStatus;
                dto.newStatus = update.newStatus;
                dto.notes = update.notes;
                dto.updatedAt = update.updatedAt;

                response.Add(dto);
            }

            return response;
        }

        // Delete Status Update
        public bool Delete(int id)
        {
            StatusUpdate? statusUpdate = statusUpdateRepo.GetById(id);

            if (statusUpdate == null)
            {
                logger.LogWarning("Delete status update failed: status update {StatusUpdateId} not found", id);
                return false;
            }

            statusUpdateRepo.Delete(statusUpdate);
            logger.LogInformation("Status update {StatusUpdateId} for issue {IssueId} deleted", id, statusUpdate.issueId);

            return true;
        }
    }
}

