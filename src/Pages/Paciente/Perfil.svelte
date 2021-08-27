<script>
    import { link, push } from "svelte-spa-router";
    import { onMount } from "svelte";
    import {url, calcularEdad} from '../../utils';

    import axios from 'axios';
    import Header from "../../Layout/Header.svelte";
    import AsidePacientes from "../../Layout/AsidePacientes.svelte";
    import ModalDatosPaciente from '../../componentes/ModalDatosPaciente.svelte';
    import ModalNuevaAtencion from '../../componentes/ModalNuevaAtencion.svelte';

    export let params;

    let paciente = {};
    let abreviacionNombre = '';
    let tiposAtenciones = [];
    let tipoAtencionMedica = 'A';
    let txtMotivoConsulta = '';

    const crearNuevaAtencion = () => {
        const atencion = {
            AseguradoraId: paciente.aseguradoraId,
            CamaId: '345f61ab-259d-4259-ad6b-7583c2fe1dbf',
            fechaIngreso: new Date().toISOString(),
            PacienteId: paciente.id,
            TipoId: tipoAtencionMedica,
            AseguradoraId: paciente.aseguradoraId,
            MedicoId: '4569d361-7f59-4840-b37a-e1c2ffbc9375',
            EdadPaciente: `${calcularEdad(paciente.fechaNacimiento)}`,
        }
        console.log(atencion)
        const config = {
            method: 'post',
            url: `${url}/atenciones`,
            data: atencion,
        };
        axios(config)
            .then(res => {
                console.log(res.data)
                if(res.data.id){
                    crearNotaMedica(res.data.id)
                }
            })
            .catch(err => {
                console.error(err)
            })

    }

    const crearNotaMedica = (idAtencion) => {
        const nota = {
            AtencionId: idAtencion,
            fecha: new Date().toISOString(),
            MotivoConsulta: txtMotivoConsulta,
            TipoNotaId: 'I',
            MedicoId: '4569d361-7f59-4840-b37a-e1c2ffbc9375',
        }
        const config = {
            method: 'post',
            url: `${url}/notasmedicas`,
            data: nota,
        }
        axios(config)
            .then(res => {
                if(res.data){
                    jQuery('.modal').modal('hide')
                    push(`/pacientes/${params.id}/AtencionMedica/HistoriaClinica/${res.data.id}`);
                }
                console.log(res.data)
            })
            .catch(err => {
                console.error(err)
            })
    }

    const cargarTiposAtenciones = () => {
        const config = {
            method: 'get',
            url: `${url}/tipoatenciones`,
        }
        axios(config)
            .then(res => {
                tiposAtenciones = res.data;
                console.log(res.data)
            })
            .catch(err => {
                console.error(err)
            })
    }

    const cargarPaciente = () => {
        const config = {
            method: 'get',
            url: `${url}/pacientes/${params.id}`,
            header: {

            }
        }
        axios(config)
            .then(res => {
                paciente = res.data
                console.log(paciente)
            })
            .catch(err => {
                console.error(err)
            })
    }

    const cargarHistoriasPaciente = () => {
        const config = {
            method: 'get',
            url: `${url}/atenciones/?Paciente=${params.id}`,
            header: {

            }
        }
        axios(config)
            .then(res => {
                console.log(res.data)
            })
            .catch(err => {
                console.error(err)
            })
    }

    onMount(()=>{
        cargarPaciente()
        cargarHistoriasPaciente()
        cargarTiposAtenciones()
    })
</script>

<AsidePacientes />

<main class="admin-main">
  <Header />
  <section class="admin-content">
    <div class="bg-dark m-b-30">
        <div class="">
            <div class="col-md-12">
                <div class="row p-b-60 p-t-60">
                    <div class="col-md-6 text-white p-b-30">
                        <div class="media">
                            <div class="avatar mr-3  avatar-xl">
                                <span class="avatar-title rounded-circle">{abreviacionNombre || '?'}</span>
                            </div>
                            <div class="media-body m-auto">
                                <h5 class="mt-0"> <span>{paciente.nombres} {paciente.primerApellido} {paciente.segundoApellido}</span> <a href="#!" class="btn ml-2 btn-primary btn-sm" data-toggle="modal" data-target="#modalDatosPersonales"><i class="mdi mdi-comment-eye"></i> ver
                                        datos</a></h5>
                                <div class="opacity-75"><span>{calcularEdad(paciente.fechaNacimiento)} años</span> | <span>{paciente.cedula}</span> </div>
                            </div>
                        </div>

                    </div>

                    <div class="col-md-6" style="text-align: right">
                        <div class="dropdown">
                            <a href="#!" type="button" class="btn text-white m-b-30 ml-2 mr-2 ml-3 btn-primary" data-toggle="modal" data-target="#modalNuevaAtencion"><i class="mdi mdi-progress-check"></i>
                                Iniciar nueva atención
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="pull-up">
        <div class="col-md-12">
            <div class="row">


                <div class="col-lg-3">

                    <div class="card m-b-30">
                        <div class="card-header">
                            <div class="avatar mr-2 avatar-xs">
                                <div class="avatar-title bg-dark rounded-circle">
                                    <i class="mdi mdi-comment-account-outline mdi-18px"></i>
                                </div>
                            </div>
                            Comentario
                        </div>
                        <div class="form-group col-lg-12">
                            <textarea class="form-control mt-2" style="width: 100%; display: block;" id="exampleFormControlTextarea1" readonly="" rows="3" name="Comentario"></textarea>
                        </div>
                    </div>

                    <div class="card m-b-30">
                        <div class="card-header">
                            <div class="avatar mr-2 avatar-xs">
                                <div class="avatar-title bg-dark rounded-circle">
                                    <i class="mdi mdi-account-heart mdi-18px"></i>
                                </div>
                            </div>
                            Ultimos Signo Vitales
                        </div>
                        <div class="card-controls">
                            <div class="dropdown">
                                <a href="#!" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"> <i class="icon mdi  mdi-dots-vertical"></i> </a>

                                <div class="dropdown-menu dropdown-menu-right">
                                    <button class="dropdown-item" type="button">Action</button>
                                    <button class="dropdown-item" type="button">Another action</button>
                                    <button class="dropdown-item" type="button">Something else here</button>
                                </div>
                            </div>
                        </div>
                        <div class="list-group list  list-group-flush">

                            <div class="list-group-item ">

                                <div class="row">
                                    <div class="col-lg-9 col-sm-10">
                                        <i class="mdi mdi-speedometer mdi-18px"></i> Peso
                                    </div>
                                    <div class="col-lg-3 col-sm-2">
                                        <p>0Lb</p>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-lg-9 col-sm-10">
                                        <i class="mdi mdi-thermometer mdi-18px"></i> Temperatura
                                    </div>
                                    <div class="col-lg-3 col-sm-2">
                                        <p>0°C</p>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-lg-9 col-sm-10">
                                        <i class="mdi mdi-chart-line mdi-18px"></i> Frecuencia Respiratoria
                                    </div>
                                    <div class="col-lg-3 col-sm-2">
                                        <p>0</p>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-lg-9 col-sm-10">
                                        <i class="mdi mdi-heart-pulse mdi-18px"></i> Frecuencia Cardiaca
                                    </div>
                                    <div class="col-lg-3 col-sm-2">
                                        <p>0</p>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-lg-9 col-sm-10">
                                        <i class="mdi mdi-heart-pulse mdi-18px"></i>  Presion Alterial (mmHg) 
                                    </div>
                                    <div class="col-lg-3 col-sm-2">
                                        <p>0/0</p>
                                    </div>
                                </div>

                            </div>

                        </div>
                    </div>
                    <!--.signos vitales-->
                    <div class="card m-b-30 d-none">
                        <div class="card-header">
                            <h5 class="m-b-0">
                                Archivos o Documentos
                            </h5>
                            <p class="m-b-0 mt-2 text-muted">
                                Puede subir documentos del paciente, como fotos de laboratorios, recetas entre otros.
                            </p>
                        </div>
                        <div class="card-body">
                            <form class="dropzone dz-clickable" action="/">
                                <div class="dz-message">
                                    <h1 class="display-4">
                                        <i class=" mdi mdi-progress-upload"></i>
                                    </h1>
                                    Puede arrastrar el documento a esta zona.<br>
                                    <span class="note needsclick">(Tambien puede hacer clic y seleccionar el archivo,
                                        luego presione subir archivo).</span>
                                    <div class="p-t-5">
                                        <a href="#!" class="btn btn-lg btn-primary">Subir Archivo</a>

                                    </div>
                                </div>
                            </form><br>

                            <div class="list-group list-group-flush ">

                                <div class="list-group-item d-flex  align-items-center">
                                    <div class="m-r-20">
                                        <div class="avatar avatar-sm ">
                                            <div class="avatar-title bg-dark rounded"><i class="mdi mdi-24px mdi-file-pdf"></i></div>
                                        </div>
                                    </div>
                                    <div class="">
                                        <div>SRS Document</div>
                                        <div class="text-muted">25.5 Mb</div>
                                    </div>

                                    <div class="ml-auto">
                                        <div class="dropdown">
                                            <a href="#!" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"> <i class="mdi  mdi-dots-vertical mdi-18px"></i>
                                            </a>

                                            <div class="dropdown-menu dropdown-menu-right">
                                                <button class="dropdown-item" type="button">Action</button>
                                                <button class="dropdown-item" type="button">Another action</button>
                                                <button class="dropdown-item" type="button">Something else here</button>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                                <div class="list-group-item d-flex  align-items-center">
                                    <div class="m-r-20">
                                        <div class="avatar avatar-sm ">
                                            <div class="avatar-title bg-dark rounded"><i class="mdi mdi-24px mdi-file-document-box"></i></div>
                                        </div>
                                    </div>
                                    <div class="">
                                        <div>Design Guide.pdf</div>
                                        <div class="text-muted">9 Mb</div>
                                    </div>

                                    <div class="ml-auto">
                                        <div class="dropdown">
                                            <a href="#!" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"> <i class="mdi  mdi-dots-vertical mdi-18px"></i>
                                            </a>

                                            <div class="dropdown-menu dropdown-menu-right">
                                                <button class="dropdown-item" type="button">Action</button>
                                                <button class="dropdown-item" type="button">Another action</button>
                                                <button class="dropdown-item" type="button">Something else here</button>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                                <div class="list-group-item d-flex  align-items-center">
                                    <div class="m-r-20">
                                        <div class="avatar avatar-sm ">
                                            <div class="avatar avatar-sm ">
                                                <div class="avatar-title  rounded"><i class="mdi mdi-24px mdi-code-braces"></i></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="">
                                        <div>response.json</div>
                                        <div class="text-muted">15 Kb</div>
                                    </div>

                                    <div class="ml-auto">
                                        <div class="dropdown">
                                            <a href="#!" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"> <i class="mdi  mdi-dots-vertical mdi-18px"></i>
                                            </a>

                                            <div class="dropdown-menu dropdown-menu-right">
                                                <button class="dropdown-item" type="button">Action</button>
                                                <button class="dropdown-item" type="button">Another action</button>
                                                <button class="dropdown-item" type="button">Something else here</button>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                                <div class="list-group-item d-flex  align-items-center">
                                    <div class="m-r-20">
                                        <div class="avatar avatar-sm ">
                                            <div class="avatar avatar-sm ">
                                                <div class="avatar-title bg-green rounded"><i class="mdi mdi-24px mdi-file-excel"></i></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="">
                                        <div>June Accounts.xls</div>
                                        <div class="text-muted">6 Mb</div>
                                    </div>

                                    <div class="ml-auto">
                                        <div class="dropdown">
                                            <a href="#!" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"> <i class="mdi  mdi-dots-vertical mdi-18px"></i>
                                            </a>

                                            <div class="dropdown-menu dropdown-menu-right">
                                                <button class="dropdown-item" type="button">Action</button>
                                                <button class="dropdown-item" type="button">Another action</button>
                                                <button class="dropdown-item" type="button">Something else here</button>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    </div>
                </div>


                <div class="col-md-6 ">
                    <div class="card m-b-30">
                        <div class="card-header">
                            <div class="avatar mr-2 avatar-xs">
                                <div class="avatar-title bg-dark rounded-circle">
                                    <i class="mdi mdi-history mdi-18px"></i>
                                </div>
                            </div>
                            Antecedentes
                        </div>
                        <div class="card-body">
                            <div class="accordion " id="accordionExample3">
                                <div class="prueba col-md-12">
                                    <h6>Alergias</h6>
                                    <hr>
                                    <div class="alert alert-danger d-none" role="alert"></div>
                                    <div class="alert alert-light d-block">
                                        <strong> No hay ningula alergia registrada </strong>
                                    </div>
                                </div>

                                <div>
                                    <div class="prueba col-md-12">
                                        <h6 >Antecedentes Patologicos</h6>
                                        <hr>
                                        <div class="alert alert-success" role="alert">
                                            <div>
                                                <strong class="text-muted"> Ninguno registrado </strong>
                                            </div>
                                            <!-- ko foreach: $root.filtrarAntecedentes(idGrupoAntecedente) --><!-- /ko -->
                                        </div>
                                    
                                        <h6>Antecedentes no Patologicos</h6>
                                        <hr>
                                        <div class="alert alert-success" role="alert">
                                            <div>
                                                <strong class="text-muted"> Ninguno registrado </strong>
                                            </div>
                                            <!-- ko foreach: $root.filtrarAntecedentes(idGrupoAntecedente) --><!-- /ko -->
                                        </div>
                                    
                                        <h6>Antecedentes Psiquiátricos</h6>
                                        <hr>
                                        <div class="alert alert-success" role="alert">
                                            <div>
                                                <strong class="text-muted"> Ninguno registrado </strong>
                                            </div>
                                            <!-- ko foreach: $root.filtrarAntecedentes(idGrupoAntecedente) --><!-- /ko -->
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>

                    <div class="card m-b-30 d-none">
                        <div class=" card-header">
                            <div class="avatar mr-2 avatar-xs">
                                <div class="avatar-title bg-dark rounded-circle">
                                    <i class="mdi mdi-comment-account-outline mdi-18px"></i>
                                </div>
                            </div>
                            Medicamentos en uso
                        </div>

                        <div class="col-12">
                            <div class="form-group buscardor dropdown">
                                <input type="text" class="form-control" name="" id="" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                <ul class="lista-buscador dropdown-menu" id="buscador">
                                    <div class="contenidoLista">
                                        <li>
                                            <a href="#!">Metrocaps</a>
                                        </li>
                                        <li>
                                            <a href="#!">Albendazol</a>
                                        </li>
                                    </div>
                                    <li class="defecto">
                                        <a href="#!"><i class="mdi mdi-plus"></i> Agregar manualmente</a>
                                    </li>
                                </ul>
                            </div>
                            <div class="alert alert-secondary alert-dismissible fade show" role="alert">
                                AirPlus
                                <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                                    <span aria-hidden="true">×</span>
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
                <!--.antecedentes columna-->

                <div class="col-md-3">
                    <!-- <div class="card m-b-30">
                        <div class="card-header">
                            <div class="avatar mr-2 avatar-xs">
                                <div class="avatar-title bg-dark rounded-circle">
                                    <i class="mdi mdi-clock-outline mdi-18px"></i>
                                </div>
                            </div>
                            Citas Programada
                        </div>
                    </div>
                    <div class="citas-programadas">
                        <div class="alert alert-border-info  alert-dismissible fade show" role="alert">
                            <div class="d-flex">
                                <div class="content">
                                    <strong>17 de septiembre 2019</strong><br>
                                    Dolor de estomago
                                </div>
                            </div>
                            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                                <span aria-hidden="true">×</span>
                            </button>
                        </div>
                    </div> -->

                    <!-- <div class="card m-b-30">
                        <div class="card-header">
                            <div class="avatar mr-2 avatar-xs">
                                <div class="avatar-title bg-dark rounded-circle">
                                    <i class="mdi mdi-progress-check mdi-18px"></i>
                                </div>
                            </div>
                            Consultas Realizadas
                        </div>
                    </div>

                    <div class="consultas-vnc">
                        <div data-bind="foreach: filtrarAtenciones('C')">
                            <div class="alert alert-border-success  alert-dismissible fade show" role="alert">
                                <div class="d-flex">
                                    <div class="content">
                                        <strong data-bind="text: new Date(createdAt).toLocaleDateString('es-DO')"> --
                                        </strong>
                                        <div data-bind="text: nombreMedico"> -- </div>
                                    </div>
                                </div>
                                <a data-bind="attr: {href: '/AtencionMedica/Resumen/' + idAtencion}" class="close"
                                    data-toggle="tooltip" data-placement="top" data-original-title="Ir">
                                    <i class="mdi mdi-open-in-new"></i>
                                </a>
                            </div>
                        </div>
                        <div class="m-auto">
                            <a href="#" class="btn ml-2 btn-primary btn-sm btn-block">Ver todas las consultas</a>
                        </div>
                    </div> -->


                    <div class="card m-b-30">
                        <div class="card-header">
                            <div class="avatar mr-2 avatar-xs">
                                <div class="avatar-title bg-dark rounded-circle">
                                    <i class="mdi mdi-progress-check mdi-18px"></i>
                                </div>
                            </div>
                            Atenciones Recibidas
                        </div>
                    </div>

                    <div class="atenciones-vnc">
                        <div>
                            <div class="alert alert-border-success  alert-dismissible fade show" role="alert">
                                <div class="d-flex">
                                    <div class="content">
                                        <strong>4/5/2020</strong>
                                        <i class="mdi mdi-checkbox-blank-circle text-secondary"></i>
                                        <div>Mariela Camilo</div>
                                        <div>Atención Ambulatoria</div>
                                    </div>
                                </div>
                                <a use:link class="close" data-toggle="tooltip" data-placement="top" data-original-title="Ir" href="/AtencionMedica/Resumen">
                                    <i class="mdi mdi-open-in-new"></i>
                                </a>
                            </div>
                        </div>

                        <!-- <div class="m-auto">
                            <a href="#" class="btn ml-2 btn-primary btn-sm btn-block">Ver todas las atenciones</a>
                        </div> -->
                    </div>
                </div>
                <!--.citas columna-->
            </div>
        </div>
    </div>
    <!--.pull-on-->
</section>
</main>

<ModalDatosPaciente />
<ModalNuevaAtencion
    {tiposAtenciones}
    {tipoAtencionMedica}
    bind:motivoConsulta={txtMotivoConsulta}
    on:crearAtencion={crearNuevaAtencion}
/>