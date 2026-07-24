using OmanCommunityServicesPlatform.Enums;
using System.ComponentModel.DataAnnotations;

namespace OmanCommunityServicesPlatform.DTOs
{
    public class CreateRegionDto
    {
        // ── Request DTOs ─ what the client sends ────────────────────────────────────────────
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
    // ── Response DTOs ─ what the API sends back ────────────────────────────────────────────

    public class RegionResponseDto
    {
        public int regionId { get; set; }
        public string regionName { get; set; }
        public Governorate governorate { get; set; }
    }
}
