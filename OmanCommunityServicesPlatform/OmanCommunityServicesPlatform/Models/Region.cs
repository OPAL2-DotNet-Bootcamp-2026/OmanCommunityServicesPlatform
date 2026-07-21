using Microsoft.EntityFrameworkCore;
using OmanCommunityServicesPlatform.Enums;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OmanCommunityServicesPlatform.Models
{
    [Table("Regions")]
    [Index(nameof(regionName), IsUnique=true)]
    public class Region
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int regionId { get; set; }       // System Generated

        [Required]
        [MaxLength(100)]
        public string regionName { get; set; }      // User Input

        [Required]
        public Governorate governorate { get; set; }     // From List

        // Navigation Properties
        public ICollection<User> Users { get; set; }
        public ICollection<Department> Departments { get; set; }
        public ICollection<Issue> Issues { get; set; }
    }
}
