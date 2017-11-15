DROP TRIGGER IF EXISTS updated_projects_trigger ON projects CASCADE;
DROP TRIGGER IF EXISTS deleted_projects_trigger ON projects CASCADE;
DROP TRIGGER IF EXISTS updated_user_stories_trigger ON user_stories CASCADE;
DROP TRIGGER IF EXISTS deleted_user_stories_trigger ON user_stories CASCADE;
DROP FUNCTION IF EXISTS us_inc CASCADE;
DROP FUNCTION IF EXISTS notify_change CASCADE;
DROP FUNCTION IF EXISTS notify_delete CASCADE;
DROP TABLE IF EXISTS user_stories CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

CREATE TABLE projects(
    id SERIAL NOT NULL PRIMARY KEY,
    title VARCHAR(128) NOT NULL,
    description VARCHAR(256)
);

CREATE TABLE user_stories(
    id INTEGER NOT NULL,
    project INTEGER NOT NULL REFERENCES projects(id),
    sprint INTEGER DEFAULT -1,
    feature VARCHAR(256) NOT NULL,
    logs VARCHAR(512),
    PRIMARY KEY (project, id)
);

CREATE OR REPLACE FUNCTION us_inc(project_id INTEGER) RETURNS INTEGER AS
$BODY$
    SELECT COALESCE(MAX(us.id) + 1, 1)
    FROM user_stories us
    WHERE us.project = project_id
$BODY$
LANGUAGE sql VOLATILE;

CREATE OR REPLACE FUNCTION notify_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM pg_notify('rowchange', format('[{"%s": %s}]', TG_TABLE_NAME, row_to_json(NEW)::text));
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION notify_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM pg_notify('rowdelete', format('[{"%s": %s}]', TG_TABLE_NAME, row_to_json(OLD)::text));
    RETURN NULL;
END;
$$;

CREATE TRIGGER updated_projects_trigger AFTER INSERT OR UPDATE ON projects
FOR EACH ROW EXECUTE PROCEDURE notify_change();
CREATE TRIGGER deleted_projects_trigger AFTER DELETE ON projects
FOR EACH ROW EXECUTE PROCEDURE notify_delete();

CREATE TRIGGER updated_user_stories_trigger AFTER INSERT OR UPDATE ON user_stories
FOR EACH ROW EXECUTE PROCEDURE notify_change();
CREATE TRIGGER deleted_user_stories_trigger AFTER DELETE ON user_stories
FOR EACH ROW EXECUTE PROCEDURE notify_delete();

INSERT INTO projects (title, description) VALUES ('Honda Works', 'A Honda enigne that finally works');

INSERT INTO user_stories (feature, logs, project, id) VALUES ('Create Engine Block', 'Get help from Mercedes maybe', (SELECT p.id FROM projects p WHERE p.title='Honda Works'), 1);
INSERT INTO user_stories (feature, logs, project, id) VALUES ('Add Turbo', 'Reliable please !', (SELECT p.id FROM projects p WHERE p.title='Honda Works'), 2);

GRANT CONNECT ON DATABASE scrum to scrum_user;
GRANT USAGE ON SCHEMA public to scrum_user;
GRANT SELECT, INSERT, UPDATE, DELETE on ALL TABLES IN SCHEMA public to scrum_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public to scrum_user;
