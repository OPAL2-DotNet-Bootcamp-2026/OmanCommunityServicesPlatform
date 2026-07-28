using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Enums;
using OmanCommunityServicesPlatform.Models;
using OmanCommunityServicesPlatform.Models.Enums;
using OmanCommunityServicesPlatform.Repositories;

namespace OmanCommunityServicesPlatform.Services
{
    public class StatusUpdateService
    {
        private StatusUpdateRepo statusUpdateRepo;
        private IssueRepo issueRepo;
        private UserRepo userRepo;
        private EmailService emailService;
        private NotificationService notificationService;

        public StatusUpdateService(StatusUpdateRepo _statusUpdateRepo, IssueRepo _issueRepo, UserRepo _userRepo, EmailService _emailService, NotificationService _notificationService)
        {
            statusUpdateRepo = _statusUpdateRepo;
            issueRepo = _issueRepo;
            userRepo = _userRepo;
            emailService = _emailService;
            notificationService = _notificationService;
        }

        // Create Status Update
        public async Task<StatusUpdateResponseDto?> Create(int issueId, int updatedById, CreateStatusUpdateDto dto )
        {
            Issue? issue = issueRepo.GetById(issueId);
            if (issue == null)
                return null;

            IssueStatus previousStatus = issue.currentStatus;

            // 1. Update the issue status
            issue.currentStatus = dto.newStatus;
            issueRepo.Update();

            // 2. Create the StatusUpdate record
            StatusUpdate statusUpdate = new StatusUpdate
            {
                issueId = issueId,
                previousStatus = previousStatus,
                newStatus = dto.newStatus,
                notes = dto.notes,
                updatedAt = DateTime.UtcNow,
                updatedById = updatedById
            };
            statusUpdateRepo.Add(statusUpdate);

            // 3. Send In-App Notification to the Citizen who reported the issue
            notificationService.CreateNotification(new CreateNotificationDTO
            {
                issueId = issue.issueId,
                message = $"Your issue '{issue.title}' status changed to {dto.newStatus}.",
                type = NotificationType.StatusChange
            }, issue.reportedById);

            // 4. Send Email Notification to the Citizen
            User? reporter = userRepo.GetById(issue.reportedById);
            
            // Fire-and-forget or safety wrapper for email so external email failures don't break status updates
            try
            {
                if (reporter != null)
                {
                    await emailService.SendEmailAsync(
                        reporter.email,
                        $"Issue Status Updated: {issue.title}",
                        $"Hi {reporter.fullName}, the status of your issue \"{issue.title}\" has been updated from {previousStatus} to {dto.newStatus}."
                    );
                }
            }
            catch (Exception ex)
            {
                // Log exception (e.g., logger.LogError) without breaking the response
            }

            // 5. Return Response DTO
            return new StatusUpdateResponseDto
            {
                statusUpdateId = statusUpdate.statusUpdateId,
                issueId = issue.issueId,
                updatedById = statusUpdate.updatedById,
                previousStatus = previousStatus,
                newStatus = dto.newStatus,
                notes = dto.notes,
                updatedAt = statusUpdate.updatedAt
            };
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
                return false;

            statusUpdateRepo.Delete(statusUpdate);

            return true;
        }
    }
}

