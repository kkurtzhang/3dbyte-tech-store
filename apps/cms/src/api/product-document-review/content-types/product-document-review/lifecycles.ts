import {
  assertReviewCreate,
  immutableReviewMutation,
} from "../../utils/write-guard";
export default {
  beforeCreate: assertReviewCreate,
  beforeCreateMany: immutableReviewMutation,
  beforeUpdate: immutableReviewMutation,
  beforeUpdateMany: immutableReviewMutation,
  beforeDelete: immutableReviewMutation,
  beforeDeleteMany: immutableReviewMutation,
};
