using OmanCommunityServicesPlatform.Models;

namespace OmanCommunityServicesPlatform.Services
{
    public class CategoryService
    {
        private CategoryRepo categoryRepo;

        public CategoryService(CategoryRepo _categoryRepo)
        {
            categoryRepo = _categoryRepo;
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


    }
}
