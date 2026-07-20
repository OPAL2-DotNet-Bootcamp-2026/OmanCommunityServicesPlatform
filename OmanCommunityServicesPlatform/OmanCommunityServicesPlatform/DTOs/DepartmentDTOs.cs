using System.ComponentModel.DataAnnotations;

namespace OmanCommunityServicesPlatform.DTOs
{
    // DTO used for returning Department data to the client
    public class DepartmentDTO
    {
        public int departmentId { get; set; }
        public string departmentName { get; set; } = string.Empty;
        public string? description { get; set; }
        public string contactEmail { get; set; } = string.Empty;
        public int? regionId { get; set; } // Foreign Key
        // Display region name instead of only ID
        public string? regionName { get; set; }
        public int categoryCount { get; set; } //optional
        public int issueCount { get; set; }
        public int userCount { get; set; }
    }
    // DTO used when creating a new Department
    public class CreateDepartmentDTO
    {
        [Required(ErrorMessage = "Department name is required")]
        [MaxLength(100)]
        public string departmentName { get; set; } = string.Empty;
        [MaxLength(500)]
        public string? description { get; set; }
        [Required(ErrorMessage = "Contact email is required")]
        [MaxLength(150)]
        [EmailAddress]
        public string contactEmail { get; set; } = string.Empty;
        // User selects existing region
        public int? regionId { get; set; }

    }
    // DTO used when updating Department information
    public class UpdateDepartmentDTO
    {
        [Required(ErrorMessage = "Department name is required")]
        [MaxLength(100)]
        public string departmentName { get; set; } = string.Empty;
        [MaxLength(500)]
        public string? description { get; set; }
        [Required(ErrorMessage = "Contact email is required")]
        [MaxLength(150)]
        [EmailAddress]
        public string contactEmail { get; set; } = string.Empty;
        public int? regionId { get; set; }

    }


}
