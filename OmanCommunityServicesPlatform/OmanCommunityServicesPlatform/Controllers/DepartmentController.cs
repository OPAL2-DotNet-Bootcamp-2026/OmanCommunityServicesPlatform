using Microsoft.AspNetCore.Mvc;
using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Services;
using Microsoft.AspNetCore.Authorization;

namespace OmanCommunityServicesPlatform.Controllers
{
    [ApiController]
    [Route("department")]
    [Authorize]
    public class DepartmentController : ControllerBase
    {
        private DepartmentService departmentService;
        public DepartmentController(DepartmentService _departmentService)
        {
            departmentService = _departmentService;

        }
        [Authorize(Roles = "Admin,Staff")]
        [HttpGet("GetAllDepartments")]
        public IActionResult GetAllDepartments()
        {
            List<ResponseDepartmentDTO> result = departmentService.GetAllDepartments();
            if (result.Count > 0)
                return Ok(result);
            return NoContent();

        }
        [Authorize(Roles = "Admin,Staff")]
        [HttpGet("GetDepartmentById/{id}")]
        public IActionResult GetDepartmentById([FromRoute] int id)
        {
            ResponseDepartmentDTO department = departmentService.GetById(id);
            if (department == null)
                return NotFound();
            return Ok(department);
        }
        [Authorize(Roles = "Admin")]
        [HttpPost("Add")]
        public IActionResult Add([FromBody]CreateDepartmentDTO department)
        {
            ResponseDepartmentDTO result = departmentService.Create(department);
            if (result == null)
                return BadRequest("Department name already exists or Region does not exist");
            return Ok(result);
        }
        [Authorize(Roles = "Admin")]
        [HttpPut("Update/{id}")]
        public IActionResult Update([FromRoute] int id, [FromBody] UpdateDepartmentDTO department)
        {
            ResponseDepartmentDTO result = departmentService.Update(id, department);
            if (result == null)
                return BadRequest("Department not found, department name already exists, or Region does not exist");
            return Ok(result);
        }
        [Authorize(Roles = "Admin")]
        [HttpDelete("Delete/{id}")]
        public IActionResult Delete([FromRoute] int id)
        {
            bool deleted = departmentService.Delete(id);
            if (!deleted)
                return NotFound();
            return Ok("Department deleted successfully");
        }
    }
}