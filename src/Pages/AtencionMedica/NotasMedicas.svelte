<script>
    import { link } from "svelte-spa-router";
    import Header from "../../Layout/Header.svelte";
    import AsideAtencion from "../../Layout/AsideAtencion.svelte";
    import ModalDatosPaciente from "../../componentes/ModalDatosPaciente.svelte";
    import ModalCrearNota from "../../componentes/ModalCrearNota.svelte";
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
        <div style="margin-top:100px;">
            <div class="row">
                <div class="m-3 col-md-12">
                    <div class="row">
                        <div class="col-lg-5 col-md-4">
                            <div class="input-group input-group-flush mb-3">
                                <input data-bind="textInput: busqueda" type="search" class="form-control form-control-appended" placeholder="Buscar por medico">
                                <div class="input-group-append">
                                    <div class="input-group-text">
                                        <span class="mdi mdi-magnify"></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="mt-md-2 col-lg-2 col-md-4">
                            <label class="cstm-switch">
                                <input type="checkbox" name="option" data-bind="checked: filtrar" class="cstm-switch-input">
                                <span class="cstm-switch-indicator"></span>
                                <span class="cstm-switch-description">Solo mis notas </span>
                            </label>
                        </div>
                        <div class="col-lg-4">
                            <a href="#!" type="button" style="height: 35px !important;" data-toggle="modal" data-target="#modalNuevaNota" class="btn btn-primary"><i class="mdi mdi-plus"></i> NUEVA NOTA
                            </a>
                        </div>
                    </div>
                </div>
            </div>
    
            <div class="col-md-12 m-b-30">
                <div class="table-responsive">
                    <table class="table align-td-middle table-card">
                        <thead>
                            <tr>
                                <th>Especialista</th>
                                <th>Tipo de nota</th>
                                <th>Fecha</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody data-bind="foreach: notasFiltradas"></tbody>
                    </table>
    
                </div>
            </div>
        </div>
    </main>

<ModalDatosPaciente/>
<ModalCrearNota />