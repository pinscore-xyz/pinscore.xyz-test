module.exports = function paginate(req, res, next) {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  req.pagination = { page, limit, skip: (page - 1) * limit };
  next();
};
