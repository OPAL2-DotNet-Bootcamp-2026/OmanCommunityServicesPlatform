using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Services;

namespace OmanCommunityServicesPlatform.Controllers
{
        [ApiController]
        [Route("region")]
        [Authorize]
    public class RegionController : ControllerBase
        {
            private readonly RegionService regionService;
            public RegionController(RegionService _regionService)
            {
                regionService = _regionService;
            }
            // Create Region
            [HttpPost("Add")]
            [Authorize(Roles = "Admin")]
            public IActionResult Add([FromBody] CreateRegionDto dto)
            {
                RegionResponseDto? result = regionService.Create(dto);
            if (result == null)
            {
                // Return a standard Problem Details response
                return Problem(
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "Unable to create region",
                    detail: "Region name already exists."
                );
            }
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
            {
                // Return a standard Problem Details response
                return Problem(
                    statusCode: StatusCodes.Status404NotFound,
                    title: "Region not found",
                    detail: $"Region with ID {id} was not found."
                );
            }
            return Ok(result);
            }

            // Update Region
            [HttpPut("Update/{id}")]
            [Authorize(Roles = "Admin")]
            public IActionResult Update(int id, [FromBody] UpdateRegionDto dto)
            {
                RegionResponseDto? result = regionService.Update(id, dto);
            if (result == null)
            {
                // Return a standard Problem Details response
                return Problem(
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "Unable to update region",
                    detail: "Region not found or region name already exists."
                );
            }
            return Ok(result);
            }

            // Delete Region
            [HttpDelete("Delete/{id}")]
            [Authorize(Roles = "Admin")]    
            public IActionResult Delete(int id)
            {
                bool result = regionService.Delete(id);
            if (!result)
            {
                // Return a standard Problem Details response
                return Problem(
                    statusCode: StatusCodes.Status404NotFound,
                    title: "Region not found",
                    detail: $"Region with ID {id} was not found."
                );
            }
            return Ok("Region deleted successfully");
            }
        }
    
}
