using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OmanCommunityServicesPlatform.Models
{
    [Index(nameof(categoryName), IsUnique = true)]
    [Table("Categories")]
    public class Category
    {
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int categoryId {  get; set; }                     // system generated
    [Required]
    [MaxLength(100)]
    public string categoryName { get; set; }                // user input
    [MaxLength(300)]
    public string? description { get; set; }                // user input (optional)
    [ForeignKey("department")]
    public int departmentId { get; set; }                  // from list
    public virtual Department department { get; set; }    // navigation property
    public ICollection<Issue> Issues { get; set; }       // navigation property
    }
}
