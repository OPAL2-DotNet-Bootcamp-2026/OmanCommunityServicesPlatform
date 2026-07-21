using System.ComponentModel.DataAnnotations;


namespace OmanCommunityServicesPlatform.DTOs
{
    
    public class RepoCategoryDTO   //GET
    {
        public int categoryId { get; set; }
        public string categoryName { get; set; } = string.Empty;
        public string? description { get; set; }
        public int departmentId { get; set; }
        public string? departmentName { get; set; }
        public int issueCount { get; set; }
    }
    //Used when creating a new category 
    public class CreateCategoryDTO   //POST
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
    public class UpdateCategoryDTO   //PUT
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
