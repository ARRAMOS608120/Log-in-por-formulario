const express = require('express')
const app = express()

const listarProductos = require('./generadorFaker.js')

const http = require ('http').Server(app);
const io = require ('socket.io')(http);
const ContenedorSql = require ('./contenedorsql.js')

const {options1} = require('./options/mariaDB');
const {options} = require( './options/SQLite3.js');

const sqlproductos = new ContenedorSql(options1)
const sqlmensajes = new ContenedorSql(options)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))

const session =  require ('express-session')

const MongoStore = require ('connect-mongo')
const advancedOptions = { useNewUrlParser: true, useUnifiedTopology: true }

app.use(session({
    store: MongoStore.create({ mongoUrl:'mongodb+srv://ariel:Coder2021@cluster0.wjzen.mongodb.net/ecommerce?retryWrites=true&w=majority',
    mongoOptions: advancedOptions, ttl: 600
    }),
    secret: 'secreto',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
        maxAge: 600000
    }
}))


const path =  require ('path')


function Auth(req, res, next) {
    if (req.session?.nombre) {
        next()
    } else {
        res.redirect('/login')
    }
}
app.get('/', Auth, (req, res) => {
    res.render(path.join(process.cwd(), '/public/plantillas/index.hbs'), { nombre: req.session.nombre })
})

app.get('/login', (req, res) => {
    const nombre = req.session?.nombre
    if (nombre) {
        res.redirect('/')
    } else {
        res.sendFile(path.join(process.cwd(), '/public/login.html'))
    }
})

app.set('view engine', 'hbs')

app.set('views', './public/plantillas')

app.get('/logout', (req, res) => {
    const nombre = req.session?.nombre
    if (nombre) {
        req.session.destroy(err => {
            if (!err) {
                res.render(path.join(process.cwd(), './public/plantillas/logout.hbs'), { nombre })
            } else {
                res.redirect('/')
            }
        })
    } else {
        res.redirect('/')
    }
})

app.post('/login', (req, res) => {
    req.session.nombre = req.body.nombre
    res.redirect('/')
})

sqlmensajes.crearTablaMensajes();

async function crear ( ){
    await sqlproductos.crearTablaProductos();
}
crear();

io.on('connection', async socket => {

    console.log('Nuevo cliente conectado!');

    socket.emit('productos', await sqlproductos.listarProductos());

    socket.on('update', async producto  => {
        await sqlproductos.insertarProducto(producto)
        io.sockets.emit('productos', await sqlproductos.listarProductos());
    })

    socket.emit('mensajes', await sqlmensajes.listarMensajes());

    socket.on('nuevoMensaje', async mensaje => {
        mensaje.fyh = new Date().toLocaleString()
        await sqlmensajes.insertarMensaje(mensaje)
        io.sockets.emit('mensajes', await sqlmensajes.listarMensajes());
    })
});



app.get('/api/productos-test',function(req, res) {
    const productos = listarProductos()
    res.render('./listaProductos',{productos});
})


http.listen(8080, () => console.log('Servidor corriendo en puerto 8080...'));