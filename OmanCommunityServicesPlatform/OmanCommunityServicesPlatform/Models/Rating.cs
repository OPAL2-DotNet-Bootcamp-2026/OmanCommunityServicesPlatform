using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OmanCommunityServicesPlatform.Models
{
    [Table("Ratings")]
    [Index(nameof(issueId), nameof(userId), IsUnique = true)]

    public class Rating
    {

        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)] // This will make the ratingId auto-increment
        public int ratingId { get; set; } //System generated - Primary key for the Rating entity

        [ForeignKey(nameof(Issue))] // Specifies that the issueId property is a foreign key referencing the Issue entity
        public int issueId { get; set; } // Foreign Key from Issue - referencing the Issue entity
        public Issue Issue { get; set; } // Navigation property to access the related Issue entity


        [ForeignKey(nameof(User))] // Specifies that the userId property is a foreign key referencing the User entity
        public int userId { get; set; } // Foreign Key from User - referencing the User entity
        public User User { get; set; } // Navigation property to access the related User entity


        [Required]
        [Range(1, 5)] // Validation to ensure the score is between 1 and 5
        public int score { get; set; } //user input - The rating score given by the user

        [StringLength(500)] // Validation to limit the feedback length to 500 characters
        public string? feedback { get; set; } // user input - Optional feedback provided by the user about the issue


        [Required]
        public DateTime ratedAt { get; set; } = DateTime.UtcNow; // Default value set to the current UTC date and time when a new rating is created

    }
}