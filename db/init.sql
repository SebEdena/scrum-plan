DROP TRIGGER IF EXISTS created_projects_trigger ON projects CASCADE;
DROP TRIGGER IF EXISTS updated_projects_trigger ON projects CASCADE;
DROP TRIGGER IF EXISTS deleted_projects_trigger ON projects CASCADE;
DROP TRIGGER IF EXISTS created_user_stories_trigger ON user_stories CASCADE;
DROP TRIGGER IF EXISTS updated_user_stories_trigger ON user_stories CASCADE;
DROP TRIGGER IF EXISTS deleted_user_stories_trigger ON user_stories CASCADE;
DROP TRIGGER IF EXISTS pick_us_number ON user_stories CASCADE;
DROP FUNCTION IF EXISTS us_inc CASCADE;
DROP FUNCTION IF EXISTS notify_create CASCADE;
DROP FUNCTION IF EXISTS notify_update CASCADE;
DROP FUNCTION IF EXISTS notify_delete CASCADE;
DROP TABLE IF EXISTS user_stories CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

CREATE TABLE projects(
    id SERIAL NOT NULL PRIMARY KEY,
    title VARCHAR(128) NOT NULL,
    description VARCHAR(256) DEFAULT ''
);

CREATE TABLE user_stories(
    id INTEGER NOT NULL,
    project INTEGER NOT NULL REFERENCES projects(id),
    sprint INTEGER NOT NULL DEFAULT -1,
    feature VARCHAR(256) NOT NULL,
    estimate NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (estimate >= 0),
    logs VARCHAR(512) DEFAULT '',
    PRIMARY KEY (project, id)
);

CREATE OR REPLACE FUNCTION us_inc() RETURNS TRIGGER AS
$$
  BEGIN
    NEW.id := (SELECT COALESCE(MAX(us.id) + 1, 1)
    FROM user_stories us
    WHERE us.project = NEW.project);
    RETURN NEW;
  END
$$
LANGUAGE plpgsql VOLATILE;

CREATE OR REPLACE FUNCTION notify_create() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM pg_notify('insert', format('[{"%s": %s}]', TG_TABLE_NAME, row_to_json(NEW)::text));
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION notify_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM pg_notify('update', format('[{"%s": %s}]', TG_TABLE_NAME, row_to_json(NEW)::text));
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION notify_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM pg_notify('delete', format('[{"%s": %s}]', TG_TABLE_NAME, row_to_json(OLD)::text));
    RETURN NULL;
END;
$$;

CREATE TRIGGER created_projects_trigger AFTER INSERT ON projects
FOR EACH ROW EXECUTE PROCEDURE notify_create();
CREATE TRIGGER updated_projects_trigger AFTER UPDATE ON projects
FOR EACH ROW EXECUTE PROCEDURE notify_update();
CREATE TRIGGER deleted_projects_trigger AFTER DELETE ON projects
FOR EACH ROW EXECUTE PROCEDURE notify_delete();

CREATE TRIGGER created_user_stories_trigger AFTER INSERT ON user_stories
FOR EACH ROW EXECUTE PROCEDURE notify_create();
CREATE TRIGGER updated_user_stories_trigger AFTER UPDATE ON user_stories
FOR EACH ROW EXECUTE PROCEDURE notify_update();
CREATE TRIGGER deleted_user_stories_trigger AFTER DELETE ON user_stories
FOR EACH ROW EXECUTE PROCEDURE notify_delete();

CREATE TRIGGER pick_us_number BEFORE INSERT ON user_stories
FOR EACH ROW EXECUTE PROCEDURE us_inc();

INSERT INTO projects (title, description) VALUES ('Honda Works', 'A Honda enigne that finally works');

INSERT INTO user_stories (feature, logs, project) VALUES ('Create Engine Block', 'Get help from Mercedes maybe', (SELECT p.id FROM projects p WHERE p.title='Honda Works'));
INSERT INTO user_stories (feature, logs, project) VALUES ('Add Turbo', 'Reliable please !', (SELECT p.id FROM projects p WHERE p.title='Honda Works'));

GRANT CONNECT ON DATABASE scrum to scrum_user;
GRANT USAGE ON SCHEMA public to scrum_user;
GRANT SELECT, INSERT, UPDATE, DELETE on ALL TABLES IN SCHEMA public to scrum_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public to scrum_user;
