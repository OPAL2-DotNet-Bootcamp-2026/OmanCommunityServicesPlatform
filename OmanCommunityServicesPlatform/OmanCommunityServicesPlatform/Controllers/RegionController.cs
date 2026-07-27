using Microsoft.AspNetCore.Mvc;
using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Services;

namespace OmanCommunityServicesPlatform.Controllers
{

        [ApiController]
        [Route("region")]
        public class RegionController : ControllerBase
        {
            private readonly RegionService regionService;
            public RegionController(RegionService _regionService)
            {
                regionService = _regionService;
            }
            // Create Region
            [HttpPost("Add")]
            public IActionResult Add([FromBody] CreateRegionDto dto)
            {
                RegionResponseDto? result = regionService.Create(dto);
                if (result == null)
                    return BadRequest("Region name already exists.");
                return Ok(result);
            }

            // Get All Regions
            [HttpGet("GetAll")]
            public IActionResult GetAll()
            {
                List<RegionResponseDto> result = regionService.GetAll();
                if (result.Count == 0)
                    return NoContent();
                return Ok(result);
            }

            // Get Region By ID
            [HttpGet("GetById/{id}")]
            public IActionResult GetById(int id)
            {
                RegionResponseDto? result = regionService.GetById(id);
                if (result == null)
                    return NotFound("Region not found");
                return Ok(result);
            }

            // Update Region
            [HttpPut("Update/{id}")]
            public IActionResult Update(int id, [FromBody] UpdateRegionDto dto)
            {
                RegionResponseDto? result = regionService.Update(id, dto);
                if (result == null)
                    return BadRequest("Region not found or region name already exists");
                return Ok(result);
            }

            // Delete Region
            [HttpDelete("Delete/{id}")]
            public IActionResult Delete(int id)
            {
                bool result = regionService.Delete(id);
                if (!result)
                    return NotFound("Region not found");
                return Ok("Region deleted successfully");
            }
        }
    
}
