using OmanCommunityServicesPlatform.Enums;
using OmanCommunityServicesPlatform.Models;
using System.ComponentModel.DataAnnotations;

namespace OmanCommunityServicesPlatform.DTOs
{
    
    // ── Request DTOs — what the client sends ─────────────────────────────────

    public class RegisterUserDto
    {
        [Required(ErrorMessage = "Name is required.")]
        [MaxLength(50)]
        public string name { get; set; }

        [Required(ErrorMessage = "Email is Required.")]
        [EmailAddress(ErrorMessage = "Invalid Email format.")]
        [MaxLength(150)]
        public string email { get; set; }

        [Required(ErrorMessage = "Password is Required.")]
        [MaxLength(256)]
        [MinLength(6, ErrorMessage = "Password must be at least 6 characters.")]
        public string password { get; set; }

        [MaxLength(20)]
        [MinLength(8, ErrorMessage = "Phone number must be at least 8 numbers.")]
        public string? phoneNumber { get; set; }

        public int? regionId { get; set; } // Optional

    }

    public class LoginDto
    {
        [Required(ErrorMessage = "Email is Required.")]
        [EmailAddress(ErrorMessage = "Invalid Email format.")]
        [MaxLength(150)]
        public string email { get; set; }


        [Required(ErrorMessage = "Password is Required.")]
        [MaxLength(256)]
        [MinLength(6, ErrorMessage = "Password must be at least 6 characters.")]
        public string password { get; set; }
    }

    public class UpdateProfileDto
    {
        // All fields are optional and the user can update any field
        
        [MaxLength(50)]
        public string? name { get; set; }

        [EmailAddress(ErrorMessage = "Invalid Email format.")]
        [MaxLength(150)]
        public string? email { get; set; }

        [MaxLength(20)]
        [MinLength(8, ErrorMessage = "Phone number must be at least 8 numbers.")]
        public string? phoneNumber { get; set; }

        public int? regionId { get; set; }
    }

    // Admin-only action, separate from registration
    public class ChangeUserRoleDto
    {
        [Required(ErrorMessage = "User ID is Required.")]
        public int userId { get; set; }

        [Required(ErrorMessage = "Role is Required.")]
        public UserRole role { get; set; }
    }

    // 	Admin-only action, only valid if target role is Staff/Admin
    public class AssignDepartmentDto
    {
        [Required(ErrorMessage = "User ID is Required.")]
        public int userId { get; set; }

        [Required(ErrorMessage = "Department ID is Required.")]
        public int departmentId { get; set; }
    }

    // ── Response DTOs — what the API sends back ───────────────────────────────

    public class UserResponseDto
    {
        public int userId { get; set; }
        public string name { get; set; }
        public string email { get; set; }
        public string? phoneNumber { get; set; }
        public UserRole role { get; set; }
        public int? regionId { get; set; }
        public int? departmentId { get; set; }
        public DateTime registrationDate { get; set; }
        public bool isActive { get; set; }
    }

    public class UserSummaryDto
    {
        public int userId { get; set; }
        public string email { get; set; }
        public string name { get; set; }
        public UserRole role { get; set; }
    }

    public class AssignDepartmentResponeDto
    {
        public int userId { get; set; }
        public string email { get; set; }
        public string name { get; set; }
        public UserRole role { get; set; }
        public int departmentId { get; set; }
        public string departmentName { get; set; }
    }
}
