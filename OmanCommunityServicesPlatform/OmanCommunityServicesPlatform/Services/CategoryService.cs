using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Models;
using OmanCommunityServicesPlatform.Repositories;

namespace OmanCommunityServicesPlatform.Services
{
    public class CategoryService
    {
        private CategoryRepo categoryRepo;
        private readonly ILogger<CategoryService> logger;

        public CategoryService(CategoryRepo _categoryRepo, ILogger<CategoryService> _logger)
        {
            categoryRepo = _categoryRepo;
            logger = _logger;
        }
        //Get all categories 
        public List<ResponseCategoryDTO> GetAllCategories()
        {
            List<Category> categories = categoryRepo.GetAllCategories();
            List<ResponseCategoryDTO> response = new List<ResponseCategoryDTO>();
            foreach (Category category in categories)
            {
                ResponseCategoryDTO dto = new ResponseCategoryDTO();
                dto.categoryId = category.categoryId;
                dto.categoryName = category.categoryName;
                dto.description = category.description;
                dto.departmentId = category.departmentId;

                if (category.department != null)
                    dto.departmentName = category.department.departmentName;

                dto.issueCount = category.Issues.Count;
                response.Add(dto);
            }
            return response;
        }
        //Get category response by Id 
        public ResponseCategoryDTO GetById(int id)
        {
            Category category = categoryRepo.GetCategoryById(id);
            if (category == null)
                return null;
            ResponseCategoryDTO response = new ResponseCategoryDTO();
            response.categoryId = category.categoryId;
            response.categoryName = category.categoryName;
            response.description = category.description;
            response.departmentId = category.departmentId;

            if (category.department != null)
                response.departmentName = category.department.departmentName;
            response.issueCount = category.Issues.Count;
            return response;

        }
        //Create category
        public ResponseCategoryDTO Create(CreateCategoryDTO dto)
        {
            //category name must be unique
            if (categoryRepo.IsCategoryNameExist(dto.categoryName))
            {
                logger.LogWarning("Category name {categoryName} already exists", dto.categoryName);
                return null;
            }
            Category category = new Category();
            category.categoryName = dto.categoryName;
            category.description = dto.description;
            category.departmentId = dto.departmentId;
            categoryRepo.Add(category);
            logger.LogInformation("Category {categoryName} created with ID {categoryId}", dto.categoryName, category.categoryId);
            ResponseCategoryDTO response = new ResponseCategoryDTO();
            response.categoryId = category.categoryId;
            response.categoryName = dto.categoryName;
            response.description = dto.description;
            response.departmentId = dto.departmentId;
            response.issueCount = 0;
            return response;
        }
        //Update category
        public ResponseCategoryDTO Update(int id, UpdateCategoryDTO dto)
        {
            Category category = categoryRepo.GetCategoryById(id);

            if (category == null)
            {
                logger.LogWarning("Category with ID {categoryId} not found", id);
                return null;
            }
            if (category.categoryName != dto.categoryName && categoryRepo.IsCategoryNameExist(dto.categoryName))
            {
                logger.LogWarning("Category name {categoryName} already exists", dto.categoryName);
                return null;
            }
            category.categoryName = dto.categoryName;
            category.description = dto.description;
            category.departmentId = dto.departmentId;
            categoryRepo.Update();
            logger.LogInformation("Category {categoryName} with ID {categoryId} updated", dto.categoryName, id);
            
            ResponseCategoryDTO response = new ResponseCategoryDTO();
            response.categoryId = category.categoryId;
            response.categoryName = category.categoryName;
            response.description = category.description;
            response.departmentId = category.departmentId;
            response.departmentName = category.department.departmentName;
            response.issueCount = category.Issues.Count;
            
            return response;
        }

        //Delete category
        public bool Delete(int id)
        {
            Category category = categoryRepo.GetCategoryById(id);
            if (category == null)
            {
                logger.LogWarning("Category with ID {categoryId} not found", id);
                return false;
            }
            categoryRepo.Delete(category);
            logger.LogInformation("Category {categoryName} with ID {categoryId} deleted", category.categoryName, id);
            return true;
        }
    }
}
