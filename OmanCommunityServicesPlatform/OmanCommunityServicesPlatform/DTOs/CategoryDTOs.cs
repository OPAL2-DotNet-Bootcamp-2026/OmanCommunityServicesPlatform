using OmanCommunityServicesPlatform.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OmanCommunityServicesPlatform.DTOs
{
    public class RepoCategoryDTO
    {
        public int categoryId { get; set; }
        public string categoryName { get; set; } = string.Empty;
        public string? description { get; set; }
        public int departmentId { get; set; }
        public string? departmentName { get; set; }
        public int issueCount { get; set; }
    }
    //Used when creating a new category 
    public class CreateCategoryDTO
    {
        [Required]
        [MaxLength(100)]
        public string categoryName { get; set; } = string.Empty;
        [MaxLength(300)]
        public string? description { get; set; }
        [Required]
        public int departmentId { get; set; }
    }

    // Used when updating a category
    public class UpdateCategoryDTO
    {
        [Required]
        [MaxLength(100)]
        public string categoryName { get; set; } = string.Empty;
        [MaxLength(300)]
        public string? description { get; set; }
        [Required]
        public int departmentId { get; set; }
    }

}
