
exports.up = function(knex, Promise) {
  return knex.schema.createTable('jmaxml_feeds', function(table) {
    table.uuid('uuid').notNull();
    table.timestamp('updated').notNull();
    table.string('title').notNull();
    table.string('author');
    table.json('doc', true);
    table.primary(['uuid', 'updated']);
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('jmaxml_feeds');
};
