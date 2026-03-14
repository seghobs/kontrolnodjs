module.exports = function(app) {
    const mainRoutes = require('./main');
    const adminRoutes = require('./admin');

    app.use('/', mainRoutes);
    app.use('/admin', adminRoutes);
};