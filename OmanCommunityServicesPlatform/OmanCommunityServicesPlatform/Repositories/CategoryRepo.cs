using Microsoft.EntityFrameworkCore;
using OmanCommunityServicesPlatform.Models;

namespace OmanCommunityServicesPlatform.Repositories
{
    public class CategoryRepo
    {
        private  OCSPContext context;
        public CategoryRepo(OCSPContext context)
        {
            this.context = context;
        }
        // Get all categories
        public List<Category> GetAllCategories()
        {
            return context.Categories.Include(c => c.department).Include(c => c.Issues).ToList();
        }
        //Get Category by id 
        public Category? GetCategoryById(int id)
        {
            return context.Categories.Include(c => c.department).Include(c => c.Issues).FirstOrDefault(c => c.categoryId == id);

        }
    }
}
