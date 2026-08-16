using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Models;
using OmanCommunityServicesPlatform.Repositories;

namespace OmanCommunityServicesPlatform.Services
{
    public class AttachmentService
    {
        private readonly AttachmentRepo attachmentRepo;
        private readonly IssueRepo issueRepo;
        private readonly UserRepo userRepo;
        private readonly ILogger<AttachmentService> logger;

        public AttachmentService(
            AttachmentRepo _attachmentRepo,
            IssueRepo _issueRepo,
            UserRepo _userRepo,
            ILogger<AttachmentService> _logger)
        {
            attachmentRepo = _attachmentRepo;
            issueRepo = _issueRepo;
            userRepo = _userRepo;
            logger = _logger;
        }

        // Create attachment
        public AttachmentResponseDto? Create(CreateAttachmentDto dto , int uploadedById)
        {
            Issue? issue = issueRepo.GetById(dto.issueId);

            if (issue == null)
            {
                logger.LogWarning("Attachment creation failed: issue {IssueId} not found", dto.issueId);
                return null;
            }

            User? user = userRepo.GetById(uploadedById);

            if (user == null)
            {
                logger.LogWarning("Attachment creation failed: user {UserId} not found", uploadedById);
                return null;
            }

            Attachment? existingAttachment = attachmentRepo.GetByIssueIdAndUrl(dto.issueId, dto.fileUrl);
            if (existingAttachment != null)
            {
                logger.LogWarning("Attachment creation rejected: duplicate file URL for issue {IssueId}", dto.issueId);
                return null;
            }

            Attachment attachment = new Attachment();
            attachment.issueId = dto.issueId;
            attachment.uploadedById = uploadedById;
            attachment.fileUrl = dto.fileUrl;
            attachment.fileType = dto.fileType;
            attachment.uploadedAt = DateTime.UtcNow;

            attachmentRepo.Add(attachment);
            logger.LogInformation("Attachment {AttachmentId} created for issue {IssueId} by user {UserId}", attachment.attachmentId, attachment.issueId, uploadedById);

            AttachmentResponseDto response = new AttachmentResponseDto();

            response.attachmentId = attachment.attachmentId;
            response.issueId = attachment.issueId;
            response.uploadedById = attachment.uploadedById;
            response.fileUrl = attachment.fileUrl;
            response.fileType = attachment.fileType;
            response.uploadedAt = attachment.uploadedAt;

            return response;
        }
        // Get attachments by issue ID
        public List<AttachmentResponseDto> GetByIssueId(int issueId)
        {
            List<Attachment> attachments = attachmentRepo.GetByIssueId(issueId);
            List<AttachmentResponseDto> response = new List<AttachmentResponseDto>();

            foreach (Attachment attachment in attachments)
            {
                AttachmentResponseDto dto = new AttachmentResponseDto();

                dto.attachmentId = attachment.attachmentId;
                dto.issueId = attachment.issueId;
                dto.uploadedById = attachment.uploadedById;
                dto.fileUrl = attachment.fileUrl;
                dto.fileType = attachment.fileType;
                dto.uploadedAt = attachment.uploadedAt;

                response.Add(dto);
            }
            return response;
        }
        // Get attachment by ID
        public AttachmentResponseDto? GetById(int id)
        {
            Attachment? attachment = attachmentRepo.GetById(id);

            if (attachment == null)
                return null;

            AttachmentResponseDto response = new AttachmentResponseDto();

            response.attachmentId = attachment.attachmentId;
            response.issueId = attachment.issueId;
            response.uploadedById = attachment.uploadedById;
            response.fileUrl = attachment.fileUrl;
            response.fileType = attachment.fileType;
            response.uploadedAt = attachment.uploadedAt;

            return response;

        }
        // Update attachment
        public AttachmentResponseDto? Update(int id, UpdateAttachmentDto dto, int uploadedById)
        {
            Attachment? attachment = attachmentRepo.GetById(id);

            if (attachment == null)
            {
                logger.LogWarning("Attachment update failed: attachment {AttachmentId} not found", id);
                return null;
            }

            // Ensure the logged-in Citizen owns this attachment
            if (attachment.uploadedById != uploadedById)
            {
                logger.LogWarning("Attachment update rejected: user {UserId} is not the owner of attachment {AttachmentId}", uploadedById, id);
                return null;
            }

            if (attachment.fileUrl != dto.fileUrl)
            {
                Attachment? existingAttachment = attachmentRepo.GetByIssueIdAndUrl(attachment.issueId, dto.fileUrl);

                if (existingAttachment != null)
                {
                    logger.LogWarning("Attachment update rejected: duplicate file URL for issue {IssueId}", attachment.issueId);
                    return null;
                }
            }

            attachment.fileUrl = dto.fileUrl;
            attachment.fileType = dto.fileType;

            attachmentRepo.Update();
            logger.LogInformation("Attachment {AttachmentId} updated by user {UserId}", id, uploadedById);

            AttachmentResponseDto response = new AttachmentResponseDto();

            response.attachmentId = attachment.attachmentId;
            response.issueId = attachment.issueId;
            response.uploadedById = attachment.uploadedById;
            response.fileUrl = attachment.fileUrl;
            response.fileType = attachment.fileType;
            response.uploadedAt = attachment.uploadedAt;

            return response;
        }

        public bool Delete(int id, int uploadedById, string role)
        {
            Attachment? attachment = attachmentRepo.GetById(id);

            if (attachment == null)
            {
                logger.LogWarning("Attachment deletion failed: attachment {AttachmentId} not found", id);
                return false;
            }
            // Admin can delete any attachment.
            // Citizen can delete only their own attachment.
            if (role != "Admin" && attachment.uploadedById != uploadedById)
            {
                logger.LogWarning("Attachment deletion rejected: user {UserId} with role {Role} cannot delete attachment {AttachmentId}", uploadedById, role, id);
                return false;
            }
            

            attachmentRepo.Delete(attachment);
            logger.LogInformation("Attachment {AttachmentId} deleted by user {UserId} (Role: {Role})", id, uploadedById, role);

            return true;
        }
    }
}