using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Models;
using OmanCommunityServicesPlatform.Repositories;

namespace OmanCommunityServicesPlatform.Services
{
    public class CategoryService
    {
        private readonly CategoryRepo categoryRepo;
        private readonly DepartmentRepo departmentRepo;

        public CategoryService(CategoryRepo _categoryRepo, DepartmentRepo _departmentRepo)
        {
            categoryRepo = _categoryRepo;
            departmentRepo = _departmentRepo;
        }

        // Get all categories 
        public List<ResponseCategoryDTO> GetAllCategories()
        {
            List<Category> categories = categoryRepo.GetAllCategories();
            List<ResponseCategoryDTO> response = new List<ResponseCategoryDTO>();

            foreach (Category category in categories)
            {
                ResponseCategoryDTO dto = new ResponseCategoryDTO
                {
                    categoryId = category.categoryId,
                    categoryName = category.categoryName,
                    description = category.description,
                    departmentId = category.departmentId,
                    departmentName = category.department?.departmentName,
                    issueCount = category.Issues?.Count ?? 0
                };

                response.Add(dto);
            }
            return response;
        }

        // Get category response by Id 
        public ResponseCategoryDTO GetById(int id)
        {
            Category category = categoryRepo.GetCategoryById(id);
            if (category == null)
                return null;

            return new ResponseCategoryDTO
            {
                categoryId = category.categoryId,
                categoryName = category.categoryName,
                description = category.description,
                departmentId = category.departmentId,
                departmentName = category.department?.departmentName,
                issueCount = category.Issues?.Count ?? 0
            };
        }

        // Create category
        public ResponseCategoryDTO Create(CreateCategoryDTO dto)
        {
            // 1. Category name must be unique
            if (categoryRepo.IsCategoryNameExist(dto.categoryName))
                return null;

            // 2. Validate department exists and fetch its name
            var department = departmentRepo.GetDepartmentById(dto.departmentId);
            if (department == null)
            {
                return null; // Invalid departmentId
            }

            Category category = new Category
            {
                categoryName = dto.categoryName,
                description = dto.description,
                departmentId = dto.departmentId
            };

            categoryRepo.Add(category);

            // 3. Return DTO with departmentName populated
            return new ResponseCategoryDTO
            {
                categoryId = category.categoryId,
                categoryName = category.categoryName,
                description = category.description,
                departmentId = category.departmentId,
                departmentName = department.departmentName, // Populated from validated department
                issueCount = 0
            };
        }

        // Update category
        public ResponseCategoryDTO Update(int id, UpdateCategoryDTO dto)
        {
            Category category = categoryRepo.GetCategoryById(id);
            if (category == null)
                return null;

            // Unique category name check
            if (category.categoryName != dto.categoryName && categoryRepo.IsCategoryNameExist(dto.categoryName))
            {
                return null;
            }

            // Validate new department exists and fetch its name
            var department = departmentRepo.GetDepartmentById(dto.departmentId);
            if (department == null)
            {
                return null;
            }

            category.categoryName = dto.categoryName;
            category.description = dto.description;
            category.departmentId = dto.departmentId;

            categoryRepo.Update();

            return new ResponseCategoryDTO
            {
                categoryId = category.categoryId,
                categoryName = category.categoryName,
                description = category.description,
                departmentId = category.departmentId,
                departmentName = department.departmentName,
                issueCount = category.Issues?.Count ?? 0
            };
        }

        // Delete category
        public bool Delete(int id)
        {
            Category category = categoryRepo.GetCategoryById(id);
            if (category == null)
                return false;

            categoryRepo.Delete(category);
            return true;
        }
    }
}