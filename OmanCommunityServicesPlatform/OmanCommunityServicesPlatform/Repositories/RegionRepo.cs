using OmanCommunityServicesPlatform.Models;

namespace OmanCommunityServicesPlatform.Repositories
{
    public class RegionRepo
    {
        private OCSPContext context;
        public RegionRepo(OCSPContext context)
        {
            this.context = context;
        }

        //Get all regions
        public List<Region>GetAll()
        {
            return context.Regions.ToList();
        }
        // Get one region by ID

        public Region? GetById(int regionId)
        {
            return context.Regions.FirstOrDefault(r => r.regionId == regionId);
        }
        // Get one region by name (used to prevent duplicate names)

        public Region? GetByName(string regionName)
        {
            return context.Regions.FirstOrDefault(r =>r.regionName == regionName);
        }
        // Add new region
        public void Add(Region region)
        {
            context.Regions.Add(region);
            context.SaveChanges();
        }
        // Delete region
        public void Delete(Region region)
        {
            context.Regions.Remove(region);
            context.SaveChanges();
        }
    }
}
