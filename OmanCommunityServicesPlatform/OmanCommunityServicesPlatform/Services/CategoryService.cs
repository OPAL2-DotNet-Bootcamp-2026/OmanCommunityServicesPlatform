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
        //Get category response by Id 
        public ResponseCategoryDTO GetById(int id)
        {
            Category category = categoryRepo.GetById(id);
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
                return null;
            Category category = new Category();
            category .categoryName = dto.categoryName;
            category.description = dto.description;
            category.department= dto.department;
            categoryRepo.Add(category)
            ResponseCategoryDTO response = new ResponseCategoryDTO();
            response.categoryId = category.categoryId;
            response.categoryName = dto.categoryName;
            response.description = dto.description;
            response.departmentId = dto.departmentId;
            response.issueCount = 0;
            return response;
        }
        //Update C
        public ResponseCategoryDTO Update(int id,UpdateCategoryDTO dto)
        {
            Category category = categoryRepo.GetCategoryId(id);

            if (category == null)
                return null;
            if(category.categoryName != dto.categoryName && categoryRepo.IsCategoryNameExit(dto.categoryName))
            {
                return null;
            }
            category.categoryName= dto.categoryName;
            category.description= dto.description;
            category.departmentId = dto.departmentId;
            categoryRepo.Update();

            ResponseCategoryDTO response = new ResponseCategoryDTO();

            response.CategoryId = category.categoryId;
            response.categoryName = category.categoryName;
            response.description = category.description;
            response.departmentId = category.departmentId;

            if (category.departmentId != null)
                response.departmentName = category.department.departmentName;
            response.issueCount = category.Issues.Count;
            return response;
        }

        //Delete category
        public bool Delete(int id) 
        {
            Category category =categoryRepo.GetCategoryId(id);
            if(category == null)
                return false;
            categoryRepo.Delete(category);
            return true;
        }
    }
}
