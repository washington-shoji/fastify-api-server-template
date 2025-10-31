CREATE INDEX "idx_template_api_users_email" ON "template_api_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_template_api_users_user_name" ON "template_api_users" USING btree ("user_name");--> statement-breakpoint
CREATE INDEX "idx_template_api_users_created_at" ON "template_api_users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_template_api_todos_created_at" ON "template_api_todos" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_template_api_todos_completed" ON "template_api_todos" USING btree ("completed");--> statement-breakpoint
CREATE INDEX "idx_template_api_todos_user_id" ON "template_api_todos" USING btree ("user_id");