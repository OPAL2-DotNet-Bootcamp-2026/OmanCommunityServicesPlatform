using OmanCommunityServicesPlatform.Models.Enums;
using System.ComponentModel.DataAnnotations;

namespace OmanCommunityServicesPlatform.DTOs
{
    // Data sent from the client to create a new attachment
    public class CreateAttachmentDto
    {
        [Required]
        public int issueId { get; set; }

        [Required]
        public int uploadedById { get; set; }

        [Required]
        [StringLength(300)]
        public string fileUrl { get; set; }

        [Required]
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

}
