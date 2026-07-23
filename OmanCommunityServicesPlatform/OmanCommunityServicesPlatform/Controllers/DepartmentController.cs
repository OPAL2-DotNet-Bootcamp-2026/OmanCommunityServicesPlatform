using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Services;

namespace OmanCommunityServicesPlatform.Controllers
{
    [ApiController]
    [Route("department")]
    public class DepartmentController : ControllerBase
    {
        private DepartmentService departmentService;
        public DepartmentController(DepartmentService _departmentService)
        {
            departmentService = _departmentService;

        }
        [HttpGet("GetAllDepartments")]
        public IActionResult GetAllDepartments()
        {
            List<ResponseDepartmentDTO> result = departmentService.GetAllDepartments();
            if (result.Count > 0)
                return Ok(result);
            return NoContent();

        }
        [HttpGet("GetDepartmentById/{id}")]
        public IActionResult GetDepartmentById([FromRoute] int id)
        {
            ResponseDepartmentDTO department = departmentService.GetById(id);
            if (department == null)
                return NotFound();
            return Ok(department);
        }
       [HttpPost("Add")]
        public IActionResult Add([FromBody]CreateDepartmentDTO department)
        {
            ResponseDepartmentDTO result = departmentService.Create(department);
            if (result == null)
                return BadRequest("Department name already exists");
            return Ok(result);
        }
        [HttpPut("Update/{id}")]
        public IActionResult Update([FromRoute] int id, [FromBody] UpdateDepartmentDTO department)
        {
            ResponseDepartmentDTO result = departmentService.Update(id, department);
            if (result == null)
                return NotFound();
            return Ok(result);
        }

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