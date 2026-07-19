using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OmanCommunityServicesPlatform.Models
{
    public class Rating
    {

        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)] // This will make the ratingId auto-increment
        public int ratingId { get; set; } //System generated - Primary key for the Rating entity

        [Required]
        public int issueId { get; set; } // user input - Foreign key referencing the Issue entity

        [Required]
        public int userId { get; set; } // user input - Foreign key referencing the User entity

        [Required]
        [Range(1, 5)] // Validation to ensure the score is between 1 and 5
        public int score { get; set; } //user input - The rating score given by the user

        [StringLength(500)] // Validation to limit the feedback length to 500 characters
        public string? feedback { get; set; } // user input - Optional feedback provided by the user about the issue     

        [Required]
        public DateTime ratedAt { get; set; } // System generated - The date and time when the rating was created
            = DateTime.UtcNow; // Default value set to the current UTC date and time when a new rating is created


        // Navigation Properties

        [ForeignKey(nameof(issueId))] // Specifies that the issueId property is a foreign key referencing the Issue entity
        public Issue Issue { get; set; } // Navigation property to access the related Issue entity

        [ForeignKey(nameof(userId))] // Specifies that the userId property is a foreign key referencing the User entity
        public User User { get; set; } // Navigation property to access the related User entity
    }
}
