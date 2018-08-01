import { Sequelize, DataTypes } from 'sequelize';

const Drawing = function (sequelize: Sequelize, DataTypes: DataTypes) {
    const _Drawing = sequelize.define('drawing', {
        name: DataTypes.STRING,
        drawingId: {
            type: DataTypes.BIGINT
        }
    });

    _Drawing.associate = models => {
        _Drawing.belongsToMany(models.User, {
            through: 'usersindrawings',
            foreignKey: 'drawingId'
        });
        _Drawing.hasMany(models.DrawingPoints, {
            foreignKey: 'drawingId'
        })
    };

    return _Drawing;
}

export default Drawing;
