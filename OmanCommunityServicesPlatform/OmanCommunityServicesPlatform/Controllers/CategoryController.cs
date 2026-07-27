using Microsoft.AspNetCore.Mvc;
using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Services;

namespace OmanCommunityServicesPlatform.Controllers
{
    [ApiController]
    [Route("category")]
    public class CategoryController : ControllerBase
    {
        private CategoryService categoryService;
        public CategoryController(CategoryService _categoryService)
        {
            categoryService = _categoryService;
        }
        [HttpGet("GetAllCategories")]
        public IActionResult GetAllCategories()
        {
            List<ResponseCategoryDTO> result = categoryService.GetAllCategories();

            if (result.Count > 0)
                return Ok(result);

            return NoContent();
        }

        [HttpGet("GetCategoryById/{id}")]
        public IActionResult GetCategoryById([FromRoute] int id)
        {
            ResponseCategoryDTO category = categoryService.GetById(id);

            if (category == null)
                return NotFound();

            return Ok(category);
        }

        [HttpPost("Add")]
        public IActionResult Add([FromBody] CreateCategoryDTO category)
        {
            ResponseCategoryDTO result = categoryService.Create(category);

            if (result == null)
                return BadRequest("Category name already exists.");

            return Ok(result);
        }

        [HttpPut("Update/{id}")]
        public IActionResult Update([FromRoute] int id, [FromBody] UpdateCategoryDTO category)
        {
            ResponseCategoryDTO result = categoryService.Update(id, category);

            if (result == null)
                return NotFound();

            return Ok(result);
        }
        [HttpDelete("Delete/{id}")]
        public IActionResult Delete([FromRoute] int id)
        {
            bool deleted = categoryService.Delete(id);

            if (!deleted)
                return NotFound();

            return Ok("Category deleted successfully.");
        }
    }
}
