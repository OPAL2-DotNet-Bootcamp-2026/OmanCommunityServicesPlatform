using OmanCommunityServicesPlatform.Enums;
using System.ComponentModel.DataAnnotations;

namespace OmanCommunityServicesPlatform.DTOs
{
    public class CreateRegionDto
    {
        // ── Request DTOs ─────────────────────────────────────────────
        [Required(ErrorMessage = "Region name is required.")]
        [MaxLength(100)]
        public string regionName { get; set; }

        [Required(ErrorMessage = "Governorate is required.")]
        public Governorate governorate { get; set; }
    }
    public class UpdateRegionDto
    {
        [Required(ErrorMessage = "Region name is required.")]
        [MaxLength(100)]
        public string regionName { get; set; }

        [Required(ErrorMessage = "Governorate is required.")]
        public Governorate governorate { get; set; }
    }
    // ── Response DTO ─────────────────────────────────────────────

    public class RegionResponseDto
    {
        public int regionId { get; set; }
        public string regionName { get; set; }
        public Governorate governorate { get; set; }
    }
}
