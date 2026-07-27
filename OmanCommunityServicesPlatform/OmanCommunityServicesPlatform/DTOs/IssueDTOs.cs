using OmanCommunityServicesPlatform.Enums;
using System.ComponentModel.DataAnnotations;

namespace OmanCommunityServicesPlatform.DTOs
{
    // Request DTO — what the citizen sends when creating an issue
    public class CreateIssueDto
    {
        [Required(ErrorMessage = "Title is required.")]
        [MaxLength(150,ErrorMessage = "Title cannot exceed 150 characters.")]
        public string title { get; set; } 

        [Required(ErrorMessage = "Description is required.")]
        [MaxLength(2000, ErrorMessage = "Description cannot exceed 2000 characters.")]
        public string description { get; set; }

        [Required(ErrorMessage = "Location is required.")]
        [MaxLength(300,ErrorMessage = "Location cannot exceed 300 characters.")]
        public string location { get; set; }
        public decimal? latitude { get; set; }
        public decimal? longitude { get; set; }

        [Required(ErrorMessage = "Priority is required.")]
        [EnumDataType(typeof(IssuePriority), ErrorMessage = "Invalid priority.")]
        public IssuePriority priority { get; set; }

        // Citizen selects a category, not a department
        [Range(1, int.MaxValue,ErrorMessage = "A valid category is required.")]
        public int categoryId { get; set; }

        // Citizen selects a region
        [Range(1, int.MaxValue, ErrorMessage = "A valid region is required.")]
        public int regionId { get; set; }
    }


    // Request DTO — what staff sends when changing the issue status
    public class ChangeIssueStatusDto
    {
        [Required(ErrorMessage = "New status is required.")]
        [EnumDataType(typeof(IssueStatus), ErrorMessage = "Invalid issue status.")]
        public IssueStatus newStatus { get; set; }

        [MaxLength(500, ErrorMessage = "Notes cannot exceed 500 characters.")]
        public string? notes { get; set; }
    }

    // Response DTO — what the API returns to the client
    public class IssueResponseDto
    {
       
        public int issueId { get; set; }
        public string title { get; set; }
        public string description { get; set; }
        public string location { get; set; } 
        public decimal? latitude { get; set; }
        public decimal? longitude { get; set; }
        public IssuePriority priority { get; set; }
        public IssueStatus currentStatus { get; set; }
        public DateTime reportedDate { get; set; }

        // Return meaningful names instead of foreign key numbers
        public string categoryName { get; set; } 
        public string regionName { get; set; }
        public string? assignedDepartmentName { get; set; }
    }
}

