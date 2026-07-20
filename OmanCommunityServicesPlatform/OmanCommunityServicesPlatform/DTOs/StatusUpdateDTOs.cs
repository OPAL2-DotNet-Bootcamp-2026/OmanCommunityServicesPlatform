using OmanCommunityServicesPlatform.Enums;
using System.ComponentModel.DataAnnotations;

namespace OmanCommunityServicesPlatform.DTOs
{
    public class StatusUpdateDTOs
    {

        // Request DTO — what staff sends when updating issue status
        public class CreateStatusUpdateDto
        {
            [Range(1, int.MaxValue, ErrorMessage = "A valid issue is required.")]
            public int issueId { get; set; }

            [Required(ErrorMessage = "New status is required.")]
            [EnumDataType(typeof(IssueStatus), ErrorMessage = "Invalid issue status.")]
            public IssueStatus newStatus { get; set; }

            [MaxLength(500, ErrorMessage = "Notes cannot exceed 500 characters.")]
            public string? notes { get; set; }
        }

        // Response DTO — what the API returns
        public class StatusUpdateResponseDto
        {
            public int statusUpdateId { get; set; }
            public int issueId { get; set; }
            public int updatedById { get; set; }
            public IssueStatus previousStatus { get; set; }
            public IssueStatus newStatus { get; set; }
            public string? notes { get; set; }
            public DateTime updatedAt { get; set; }
        }
    }
}
