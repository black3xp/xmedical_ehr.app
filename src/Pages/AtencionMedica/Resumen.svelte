<script>
    import { link } from "svelte-spa-router";
    import Header from "../../Layout/Header.svelte";
    import AsideAtencion from "../../Layout/AsideAtencion.svelte";
    import ModalDatosPaciente from "../../componentes/ModalDatosPaciente.svelte";
</script>

<AsideAtencion />
    <div class="contenedor-datos" id="divHeaderBar">
        <div class="row">
            <div class="col-md-6">
                <h5>
                    <span
                        class="badge badge-primary"
                        data-bind="text: titulo">Resumen general</span>
                    <span data-bind="text: paciente().nombreParaMostrar">Fiordaliza
                        De Jesus Herrera</span>
                </h5>
            </div>
            <div class="col-md-6" style="text-align: right;">

            </div>
            <div class="col-lg-12">
                <div class="dropdown">
                    <button data-toggle="modal" data-target="#modalDatosPersonales" style="box-shadow:none;" class="btn btn-outline-secondary btn-sm">
                        <i data-bind="class: icon" class="mdi mdi-comment-eye" />
                            <sapn data-bind="text: text">
                                Datos del Paciente
                            </sapn></button>

                </div>
            </div>
        </div>
    </div>

    <Header />
    <main class="admin-main">
        <div class="col-lg-12" style="margin-top: 130px;">
            <div class="card m-b-30">
                <div class="card-header">
                    <h5 class="card-title m-b-0">Resumen</h5>
                    <!-- <div class="card-controls">
                        <div class="dropdown">
                            <a href="#" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"> <i
                                    class="icon mdi  mdi-dots-vertical"></i> </a>
        
                            <div class="dropdown-menu dropdown-menu-right">
                                <button class="dropdown-item text-success" type="button"><i class="mdi mdi-plus"></i> Crear
                                    nueva nota</button>
                            </div>
                        </div>
                    </div> -->
                </div>
                <div class="card-body">
                    <div>
                        <div class="list-unstyled">
                            <div class="media">
                                <div class="avatar mr-3  avatar-sm">
                                    <img class="avatar-img rounded-circle" src="/atmosTemplate/assets/img/person.webp" alt="imagen paciente">
                                </div>
                                <div class="media-body">
                                    <h6 class="mt-0 mb-1"> <span data-bind="text: atencionMedica.nombreMedico"> -doctor
                                            name-
                                        </span>
                                        <span class="text-muted ml-3 small" data-bind="text: new Date(atencionMedica.fechaIngreso()).toLocaleString('es-DO')">
                                            -datetime-</span>
                                    </h6>
                                    <small class="mt-4 mb-4 text-primary">Motivo de Consulta</small>
                                    <pre data-bind="text: atencionMedica.motivoConsulta">                                    -motivo -consulta-
        
                                    </pre>
                                    <small class="mt-4 mb-4 text-primary">Historia de la Enfermedad</small>
                                    <p data-bind="text: atencionMedica.historiaEnfermedad">
                                        -historia enfermedad-
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div class="list-unstyled" data-bind="foreach: notas">
                            <div class="media">
                                <div class="avatar mr-3  avatar-sm">
                                    <img class="avatar-img rounded-circle" src="/atmosTemplate/assets/img/person.webp" alt="imagen paciente">
                                </div>
                                <div class="media-body">
                                    <h6 class="mt-0 mb-1"> <span data-bind="text: name"> -doctor name- </span>
                                        <span class="text-muted ml-3 small" data-bind="text: new Date(fechaHora).toLocaleString('es-DO')"> -datetime-</span>
                                    </h6>
                                    <small class="mt-4 mb-4 text-primary" data-bind="text: TIPO_NOTA_MEDICA[tipoNota]">-tipo
                                        nota-</small>
                                    <p data-bind="text: nota">
                                        -nota-
                                    </p>
                                </div>
                            </div>

                        </div>

                    </div>
                </div>
            </div>
            <div class="card m-b-30">
                <div class="card-header">
                    <h5 class="m-b-0">
                        Diagnosticos
                    </h5>

                </div>
                <div class="card-body">
                    <div class="table-responsive">

                        <table class="table table-hover ">
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Catalogo</th>
                                    <th>Descripción</th>
                                    <th>Especialista</th>
                                    <th>Comentario</th>
                                </tr>
                            </thead>
                            <tbody data-bind="foreach: diagnosticos">
                                <tr>
                                    <td data-bind="text: codigo"> -codigo-</td>
                                    <td data-bind="text: catalogo"> -catalogo-</td>
                                    <td data-bind="text: problemaMedico"> -descripcion- </td>
                                    <td data-bind="text: name"> -especialista- </td>
                                    <td data-bind="text: comentario"> -comentario- </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div class="card m-b-30 d-none">
                <div class="card-header">
                    <h6 class="m-b-0">
                        Tratamientos
                    </h6>

                </div>
                <div class="card-body">
                    <div class="table-responsive">

                        <table class="table table-hover ">
                            <thead>
                                <tr>
                                    <th>Medicamento</th>
                                    <th>Dosis</th>
                                    <th>Concentracion</th>
                                    <th>Via</th>
                                    <th>Intervalo</th>
                                    <th>Especialista</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Sol. Salino</td>
                                    <td>1000</td>
                                    <td>ML</td>
                                    <td>Intravenosa</td>
                                    <td>Cada 8 horas</td>
                                    <th>Dra. Sierra</th>
                                </tr>
                                <tr>
                                    <td>Zertal</td>
                                    <td>10</td>
                                    <td>MG</td>
                                    <td>Intravenosa</td>
                                    <td>Cada 12 horas</td>
                                    <th>Dr. Ramon Mena</th>
                                </tr>

                            </tbody>
                        </table>
                    </div>

                </div>
            </div>
            <div class="card m-b-30 d-none">
                <div class="card-header">
                    <h6 class="m-b-0">
                        Aplicaciones
                    </h6>

                </div>
                <div class="card-body">
                    <div class="table-responsive">

                        <table class="table table-hover ">
                            <thead>
                                <tr>
                                    <th>Medicamento</th>
                                    <th>Proxima aplicacion</th>
                                    <th>Ultima aplicacion</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr class="bg-soft-danger">
                                    <td>SOL. MIXTA 0.9%, 1000 CC | Dosificacion de: 500CC</td>
                                    <td><span class="badge badge-danger">En 1 horas</span></td>
                                    <td>12/03/2020 a las 9:30am</td>
                                </tr>
                                <tr class="bg-soft-warning">
                                    <td>DEXTROSA EN RINGER | Dosificacion de: 400CC</td>
                                    <td><span class="badge badge-warning">En 2 horas</span></td>
                                    <td>12/03/2020 a las 9:30am</td>
                                </tr>
                                <tr class="bg-soft-success">
                                    <td>TRAMAL 100MG | Dosificacion de: 1 Ampolla</td>
                                    <td><span class="badge badge-success">En 6 horas</span></td>
                                    <td>12/03/2020 a las 9:30am</td>
                                </tr>
                                <tr class="bg-soft-success">
                                    <td>SOL. MIXTA 0.9%, 1000 CC | Dosificacion de: 500CC</td>
                                    <td><span class="badge badge-success">Aplicado monodosis</span></td>
                                    <td>12/03/2020 a las 9:30am</td>
                                </tr>

                            </tbody>
                        </table>
                    </div>

                </div>
            </div>
            <div class="card m-b-30 d-none">
                <div class="card-header">
                    <h6 class="m-b-0">
                        Estudios
                    </h6>

                </div>
                <div class="card-body">
                    <div class="table-responsive">

                        <table class="table table-hover ">
                            <thead>
                                <tr>
                                    <th>Descripcion</th>
                                    <th>Especialista</th>
                                    <th>Diagnostico</th>
                                    <th>Comentario</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Radiografia de Torax AP y LAT</td>
                                    <td>Dra. Sierra</td>
                                    <td><span class="badge">SHIGELOSIS DEBIDA A SHIGELLA
                                            FLEXNERI</span></td>
                                    <td style="font-weight: normal;">Este es un comentario de ejemplo</td>
                                </tr>
                                <tr class="bg-soft-success">
                                    <td>Hormonas T4</td>
                                    <td>Dr. Amarante</td>
                                    <td><span class="badge">SHIGELOSIS DEBIDA A SHIGELLA
                                            FLEXNERI</span></td>
                                    <td style="font-weight: normal;">Este es un comentario de ejemplo</td>
                                </tr>
                                <tr class="bg-soft-success">
                                    <td>Hormonas T3</td>
                                    <td>Dr. Amarante</td>
                                    <td><span class="badge">SHIGELOSIS DEBIDA A SHIGELLA
                                            FLEXNERI</span></td>
                                    <td style="font-weight: normal;">Este es un comentario de ejemplo</td>
                                </tr>
                                <tr class="bg-soft-success">
                                    <td>Hemograma</td>
                                    <td>Dr. Amarante</td>
                                    <td><span class="badge">SHIGELOSIS DEBIDA A SHIGELLA
                                            FLEXNERI</span></td>
                                    <td style="font-weight: normal;">Este es un comentario de ejemplo</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                </div>
            </div>
        </div>

    </main>

<ModalDatosPaciente/>