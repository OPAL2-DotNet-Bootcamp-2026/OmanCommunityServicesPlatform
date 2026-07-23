using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Models;
using OmanCommunityServicesPlatform.Repositories;

namespace OmanCommunityServicesPlatform.Services
{
    public class AttachmentService
    {
        private AttachmentRepo attachmentRepo;
        private IssueRepo issueRepo;
        private UserRepo userRepo;

        public AttachmentService(AttachmentRepo _attachmentRepo, IssueRepo _issueRepo, UserRepo _userRepo)
        {
            attachmentRepo = _attachmentRepo;
            issueRepo = _issueRepo;
            userRepo = _userRepo;
        }
        // Create attachment
        public AttachmentResponseDto? Create(CreateAttachmentDto dto)
        {
            Issue? issue = issueRepo.GetById(dto.issueId);

            if (issue == null)
                return null;

            User? user = userRepo.GetById(dto.uploadedById);

            if (user == null)
                return null;

            Attachment? existingAttachment = attachmentRepo.GetByIssueIdAndUrl(dto.issueId, dto.fileUrl);
            if (existingAttachment != null)
                return null;

            Attachment attachment = new Attachment();
            attachment.issueId = dto.issueId;
            attachment.uploadedById = dto.uploadedById;
            attachment.fileUrl = dto.fileUrl;
            attachment.fileType = dto.fileType;
            attachment.uploadedAt = DateTime.UtcNow;

            attachmentRepo.Add(attachment);
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
    }
}