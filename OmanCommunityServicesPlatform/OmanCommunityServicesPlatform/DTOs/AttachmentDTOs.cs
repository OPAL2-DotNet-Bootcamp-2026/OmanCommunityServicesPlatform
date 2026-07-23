using OmanCommunityServicesPlatform.Models.Enums;
using System.ComponentModel.DataAnnotations;

namespace OmanCommunityServicesPlatform.DTOs
{
    // Request DTO — what the client sends when uploading an attachment
    public class CreateAttachmentDto
    {
        [Required(ErrorMessage = "Issue is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "A valid issue is required.")]
        public int issueId { get; set; }

        [Required(ErrorMessage = "Uploaded by is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "A valid user is required.")]
        public int uploadedById { get; set; }

        [Required(ErrorMessage = "File URL is required.")]
        [StringLength(300)]
        public string fileUrl { get; set; }

        [Required(ErrorMessage = "File type is required.")]
        [EnumDataType(typeof(AttachmentFileType), ErrorMessage = "Invalid file type.")]
        public AttachmentFileType fileType { get; set; }
    }
    // Data sent from the client to update an attachment
    public class UpdateAttachmentDto
    {
        [Required]
        [StringLength(300)]
        public string fileUrl { get; set; }

        [Required]
        public AttachmentFileType fileType { get; set; }
    }
    // Response DTO — what the API returns to the client
    public class AttachmentResponseDto
    {
        public int attachmentId { get; set; }
        public int issueId { get; set; }
        public int uploadedById { get; set; }
        public string fileUrl { get; set; }
        public AttachmentFileType fileType { get; set; }
        public DateTime uploadedAt { get; set; }
    }
}
