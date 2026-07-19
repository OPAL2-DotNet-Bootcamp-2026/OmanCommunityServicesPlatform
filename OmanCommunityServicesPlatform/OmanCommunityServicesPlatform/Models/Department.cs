using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OmanCommunityServicesPlatform.Models
{
    [Index(nameof(departmentName), IsUnique = true)]
    [Table("Departments")]
    public class Department
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int departmentId { get; set; }                  // system generated
        [Required]
        [MaxLength(100)]
        public string departmentName { get; set; }             // user input
        [MaxLength(500)]
        public string? description { get; set; }               // user input (optional)
        [Required]
        [MaxLength(150)]
        [EmailAddress]
        public string contactEmail { get; set; }                 // user input
        [ForeignKey("region")]
        public int? regionId { get; set; }                       // from list 
        public virtual Region? region { get; set; }              // navigation property
        public ICollection<Category> Categories { get; set; }   // navigation property
        public ICollection<Issue> Issues { get; set; }          // navigation property
        public ICollection<User> Users { get; set; }           // navigation property

    }
}
