DROP TRIGGER IF EXISTS updated_projects_trigger ON projects;
DROP TRIGGER IF EXISTS deleted_projects_trigger ON projects;
DROP FUNCTION IF EXISTS notify_projects_delete;
DROP FUNCTION IF EXISTS notify_projects_change;
DROP TABLE IF EXISTS projects;

CREATE TABLE projects(
    id SERIAL NOT NULL PRIMARY KEY,
    title VARCHAR(128),
    description VARCHAR(256)
);

CREATE FUNCTION notify_projects_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM pg_notify('rowchange', format('%s: %s', NEW.id, row_to_json(NEW)::text));
    RETURN NULL;
END;
$$;

CREATE FUNCTION notify_projects_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM pg_notify('rowdelete', format('%s: %s', OLD.id, row_to_json(OLD)::text));
    RETURN NULL;
END;
$$;

CREATE TRIGGER updated_projects_trigger AFTER INSERT OR UPDATE ON projects
FOR EACH ROW EXECUTE PROCEDURE notify_projects_change();

CREATE TRIGGER deleted_projects_trigger AFTER DELETE ON projects
FOR EACH ROW EXECUTE PROCEDURE notify_projects_delete();

INSERT INTO projects (title, description) VALUES ('Honda Works', 'A Honda enigne that finally works');

GRANT SELECT, UPDATE, DELETE on projects to scrum_user;
