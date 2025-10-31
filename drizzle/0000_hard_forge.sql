CREATE TABLE "template_api_users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "template_api_users_user_name_unique" UNIQUE("user_name"),
	CONSTRAINT "template_api_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "template_api_todos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "template_api_todos" ADD CONSTRAINT "template_api_todos_user_id_template_api_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."template_api_users"("id") ON DELETE cascade ON UPDATE no action;