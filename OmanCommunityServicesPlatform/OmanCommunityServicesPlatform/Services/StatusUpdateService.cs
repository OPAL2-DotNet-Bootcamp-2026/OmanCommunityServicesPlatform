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
        private ILogger<StatusUpdateService> logger;

        public StatusUpdateService(StatusUpdateRepo _statusUpdateRepo, IssueRepo _issueRepo, UserRepo _userRepo, EmailService _emailService, NotificationService _notificationService, ILogger<StatusUpdateService> _logger)
        {
            statusUpdateRepo = _statusUpdateRepo;
            issueRepo = _issueRepo;
            userRepo = _userRepo;
            emailService = _emailService;
            notificationService = _notificationService;
            logger = _logger;
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

            // Who moved which issue, and when. The citizen only sees the new
            // status, so this is the only record of who decided it.
            logger.LogInformation(
                "Issue {IssueId} moved from {PreviousStatus} to {NewStatus} by user {UserId}",
                issueId, previousStatus.ToString(), dto.newStatus.ToString(), updatedById);

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
                // Swallowed on purpose - a failed email must not fail the status
                // change. Logged so it is still visible afterwards.
                logger.LogError(ex,
                    "Status change email failed for issue {IssueId} to user {UserId}",
                    issueId, issue.reportedById);
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
        /// <summary>
        /// The history of an issue as its own reporter may see it.
        /// Returns null when the issue does not exist or belongs to someone
        /// else, so the caller can answer identically in both cases.
        ///
        /// The staff-only fields are stripped HERE rather than hidden in the
        /// UI: notes are the internal notes staff write while working an
        /// issue, and updatedById identifies the individual officer. Neither
        /// should leave the server for a citizen.
        /// </summary>
        public List<StatusUpdateResponseDto>? GetByIssueIdForReporter(int issueId, int reporterId)
        {
            Issue? issue = issueRepo.GetById(issueId);
            if (issue == null || issue.reportedById != reporterId)
                return null;

            List<StatusUpdateResponseDto> updates = GetByIssueId(issueId);

            foreach (StatusUpdateResponseDto update in updates)
            {
                update.notes = null;
                update.updatedById = 0;
            }

            return updates;
        }

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

