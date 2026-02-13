import { Module } from "@medusajs/framework/utils";
import AuthModuleService from "./service";

export const AUTH_MODULE = "auth";

export default Module(AUTH_MODULE, {
  service: AuthModuleService,
});
