using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OmanCommunityServicesPlatform.Models
{
    public class Rating
    {

        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int ratingId { get; set; }

        [Required]
        public int issueId { get; set; }

        [Required]
        public int userId { get; set; }

        [Required]
        [Range(1, 5)]
        public int score { get; set; }

        [StringLength(500)]
        public string? feedback { get; set; }

        [Required]
        public DateTime ratedAt { get; set; }
            = DateTime.UtcNow;


        // Navigation Properties

        [ForeignKey(nameof(issueId))]
        public Issue Issue { get; set; } 

        [ForeignKey(nameof(userId))]
        public User User { get; set; }
    }
}
