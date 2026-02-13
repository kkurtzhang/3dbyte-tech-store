import { MedusaService } from "@medusajs/framework/utils";
import { Review } from "./models/review";

class ReviewsModuleService extends MedusaService({
  Review,
}) {
  // Custom methods only - base CRUD provided by MedusaService
}

export default ReviewsModuleService;
